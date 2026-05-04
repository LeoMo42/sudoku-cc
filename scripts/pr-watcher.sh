#!/usr/bin/env bash
#
# pr-watcher.sh — poll open PRs for new comments / reviews and append
# them as JSON-lines to ~/.pr-inbox/inbox.jsonl. Designed to be paired
# with a `tail -f` watcher (e.g. Claude's Monitor tool) so the AI gets
# notified only when there's something new to look at — instead of
# burning tokens on empty polls.
#
# Modes
# -----
#   ./scripts/pr-watcher.sh              # one shot, exits when done
#   ./scripts/pr-watcher.sh --watch      # loops with default 600s sleep
#   ./scripts/pr-watcher.sh --watch 300  # loops with 300s sleep
#
# State
# -----
#   ~/.pr-inbox/inbox.jsonl     append-only log; safe to read and clear
#   ~/.pr-inbox/cursors/pr-N.txt  per-PR last-poll ISO timestamp
#   ~/.pr-inbox/.last-poll      global last-poll wall clock (debug)
#
# Output schema (one JSON object per line)
# ----------------------------------------
#   {
#     "ts":     "2026-04-27T10:15:00Z",   poll wall-clock
#     "pr":     189,                       PR number
#     "title":  "feat(seo): ...",          PR title (cached per poll)
#     "kind":   "comment" | "review",      what kind of GH event
#     "author": "github-actions[bot]",     comment / review author
#     "url":    "https://github.com/...",  permalink
#     "summary": "first 200 chars of body" trimmed body for triage
#   }
#
# Filtering
# ---------
# Only emits events authored by someone OTHER than $REPO_OWNER (i.e.
# the user themselves). My own replies don't trigger me. To extend,
# edit the `EXCLUDE_AUTHORS` array below.
#
# Requirements: gh (authenticated), jq.

set -euo pipefail

INBOX_DIR="${PR_WATCHER_INBOX:-$HOME/.pr-inbox}"
CURSOR_DIR="$INBOX_DIR/cursors"
INBOX_LOG="$INBOX_DIR/inbox.jsonl"
LAST_POLL="$INBOX_DIR/.last-poll"

mkdir -p "$CURSOR_DIR"

# Resolve owner/repo from the current git remote so the script works
# regardless of which copy of the repo is checked out.
REPO_NWO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
REPO_OWNER="${REPO_NWO%%/*}"

EXCLUDE_AUTHORS=("$REPO_OWNER")

is_excluded() {
  local author="$1"
  for excl in "${EXCLUDE_AUTHORS[@]}"; do
    [[ "$author" == "$excl" ]] && return 0
  done
  return 1
}

# Default cursor (when none exists yet) = 24h ago, so a fresh install
# doesn't dump the entire history of every PR into the inbox.
default_cursor() {
  date -u -v-1d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
    || date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%SZ
}

now_iso() { date -u +%Y-%m-%dT%H:%M:%SZ; }

poll_once() {
  local ts; ts=$(now_iso)
  echo "$ts" > "$LAST_POLL"

  # Open PRs authored by me. --json keeps the payload tiny.
  # Bail on failure rather than masking with `|| echo '[]'` — silently
  # treating a network/auth/rate-limit failure as "no PRs" hides the
  # error and would let cursors advance under it (#225).
  local prs_json
  if ! prs_json=$(gh pr list --author @me --state open --json number,title,headRepositoryOwner,headRepository 2>/dev/null); then
    echo "[pr-watcher] gh pr list failed; skipping this poll (cursors not advanced)" >&2
    return 1
  fi

  # Read PRs into an array. The previous code piped jq into a `while`
  # loop, which runs in a subshell — `return` and shared state leak
  # away from poll_once. The array form keeps the loop body in the
  # function's own shell so per-PR failures can record an overall rc
  # and cursor writes can be gated on success.
  local -a prs=()
  while IFS= read -r pr; do
    [ -z "$pr" ] && continue
    prs+=("$pr")
  done < <(echo "$prs_json" | jq -c '.[]')

  local rc=0
  local pr pr_num pr_title cursor cursor_file comments reviews line author

  for pr in "${prs[@]}"; do
    pr_num=$(echo "$pr" | jq -r .number)
    pr_title=$(echo "$pr" | jq -r .title)
    cursor_file="$CURSOR_DIR/pr-$pr_num.txt"
    cursor=$(cat "$cursor_file" 2>/dev/null || default_cursor)

    # 1. Issue comments (general PR discussion). `?since=` filters by
    #    updated_at, which catches edits too — an edited review is
    #    still worth seeing. --paginate follows Link headers so a long
    #    outage producing >100 events on resume can't silently drop
    #    the tail (otherwise the cursor would advance past events we
    #    never wrote). The output is captured into a variable so we
    #    can detect a failed call and skip the cursor advance for this
    #    PR — the original code piped directly to `while` which threw
    #    the gh exit status away (#225). errexit is suppressed inside
    #    poll_once because the watcher loop calls it as `poll_once || …`.
    if ! comments=$(gh api --paginate "repos/$REPO_NWO/issues/$pr_num/comments?since=$cursor&per_page=100" \
      --jq '.[] | {pr: '"$pr_num"', kind: "comment", author: .user.login, url: .html_url, body: .body, ts: .updated_at}' 2>/dev/null); then
      echo "[pr-watcher] gh api failed (PR $pr_num issue comments); cursor not advanced" >&2
      rc=1
      continue
    fi
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      author=$(echo "$line" | jq -r .author)
      is_excluded "$author" && continue
      # Trim body to 200 chars; flatten newlines so the JSONL stays
      # one-line-per-event.
      echo "$line" \
        | jq -c --arg ts "$ts" --arg title "$pr_title" \
            '{ts: $ts, pr: .pr, title: $title, kind: .kind, author: .author, url: .url, summary: (.body | gsub("\n"; " ") | .[0:200])}' \
        >> "$INBOX_LOG"
    done <<< "$comments"

    # 2. Formal PR reviews (the "Approve / Request changes / Comment"
    #    kind). The reviews endpoint doesn't support `?since=`, so we
    #    filter client-side by `submitted_at`. Same capture-and-bail
    #    pattern as the comments call above.
    if ! reviews=$(gh api --paginate "repos/$REPO_NWO/pulls/$pr_num/reviews?per_page=100" \
      --jq '.[] | select(.submitted_at != null and .submitted_at > "'"$cursor"'") | {pr: '"$pr_num"', kind: "review", author: .user.login, url: .html_url, body: (.body // ""), ts: .submitted_at, state: .state}' 2>/dev/null); then
      echo "[pr-watcher] gh api failed (PR $pr_num reviews); cursor not advanced" >&2
      rc=1
      continue
    fi
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      author=$(echo "$line" | jq -r .author)
      is_excluded "$author" && continue
      echo "$line" \
        | jq -c --arg ts "$ts" --arg title "$pr_title" \
            '{ts: $ts, pr: .pr, title: $title, kind: (.kind + ":" + (.state // "")), author: .author, url: .url, summary: (.body | gsub("\n"; " ") | .[0:200])}' \
        >> "$INBOX_LOG"
    done <<< "$reviews"

    # Cursor advance only after BOTH gh api calls for this PR succeeded
    # and we wrote any matching events. A future PR's failure won't
    # roll this one back; we already wrote the events.
    echo "$ts" > "$cursor_file"
  done

  return $rc
}

if [[ "${1:-}" == "--watch" ]]; then
  interval="${2:-600}"
  echo "[pr-watcher] watch mode, polling every ${interval}s. inbox: $INBOX_LOG" >&2
  while true; do
    poll_once || echo "[pr-watcher] poll failed at $(now_iso); will retry" >&2
    sleep "$interval"
  done
else
  poll_once
fi
