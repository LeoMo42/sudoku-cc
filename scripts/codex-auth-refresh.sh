#!/usr/bin/env bash
# codex-auth-refresh.sh — sync local ~/.codex/auth.json into the
# CODEX_AUTH_JSON GitHub repo secret so the Codex PR review workflow
# keeps using your ChatGPT Plus session instead of a per-token API key.
#
# Why this exists:
#   - Codex CLI on this machine is logged in via `codex login` (Plus auth)
#   - GitHub Actions cannot do interactive OAuth, so CI uses the same
#     auth.json file shipped as a GitHub secret
#   - Sessions expire after roughly 8 days. Re-run this weekly (or
#     whenever a CI run fails with 401) to refresh the secret.
#
# Default behavior: PRINT instructions for the GitHub web UI.
# Pass --auto to upload via the gh CLI instead.
#
# Usage:
#   scripts/codex-auth-refresh.sh           # print manual instructions
#   scripts/codex-auth-refresh.sh --auto    # upload via gh CLI
#   scripts/codex-auth-refresh.sh --check   # validate auth.json, no upload

set -euo pipefail

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
AUTH_FILE="$CODEX_HOME/auth.json"
SECRET_NAME="CODEX_AUTH_JSON"
MODE="${1:-instructions}"

color_red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
color_yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
color_green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
color_dim()    { printf '\033[0;90m%s\033[0m\n' "$*"; }

# 1. auth.json must exist
if [ ! -f "$AUTH_FILE" ]; then
  color_red "ERROR: $AUTH_FILE not found"
  echo "Run 'codex login' first to authenticate via ChatGPT Plus."
  exit 1
fi

# 2. Must be ChatGPT auth (not API key)
auth_mode=$(jq -r '.auth_mode // "unknown"' "$AUTH_FILE")
if [ "$auth_mode" != "chatgpt" ]; then
  color_red "ERROR: auth_mode is '$auth_mode', expected 'chatgpt'"
  echo "API-key auth in this file would defeat the purpose. Run:"
  echo "  codex logout && codex login"
  echo "to switch to ChatGPT Plus."
  exit 1
fi

# 3. Refresh token must be present
has_refresh=$(jq -r '(.tokens.refresh_token // "") | length > 0' "$AUTH_FILE")
if [ "$has_refresh" != "true" ]; then
  color_red "ERROR: refresh_token is missing from auth.json"
  echo "Run 'codex logout && codex login' to re-establish auth."
  exit 1
fi

# 4. Age check (warn if approaching 8-day expiry)
last_refresh=$(jq -r '.last_refresh // ""' "$AUTH_FILE")
if [ -n "$last_refresh" ]; then
  # macOS / BSD date vs GNU date — try both
  if last_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$last_refresh" +%s 2>/dev/null); then :;
  elif last_epoch=$(date -d "$last_refresh" +%s 2>/dev/null); then :;
  else last_epoch=0; fi

  if [ "$last_epoch" != "0" ]; then
    now=$(date +%s)
    age_days=$(( (now - last_epoch) / 86400 ))
    if [ "$age_days" -gt 6 ]; then
      color_yellow "⚠️  last_refresh was ~${age_days} days ago (~8d expiry approaching)"
      echo "   Recommend running 'codex login' first to bump the refresh time"
      echo "   before uploading. Otherwise the secret may go stale soon."
      echo
    else
      color_dim "last_refresh: ~${age_days} days ago (well within ~8d window)"
    fi
  fi
fi

# 5. Show redacted preview
echo
echo "$(color_dim "Local file:") $AUTH_FILE"
echo "$(color_dim "Size:")       $(wc -c < "$AUTH_FILE" | tr -d ' ') bytes"
echo "$(color_dim "Preview (tokens redacted):")"
jq '{
  auth_mode,
  last_refresh,
  tokens: (.tokens | with_entries(.value = "<REDACTED:\(.value | length)chars>"))
}' "$AUTH_FILE" | sed 's/^/  /'
echo

if [ "$MODE" = "--check" ]; then
  color_green "✅ auth.json looks healthy. Re-run without --check to upload."
  exit 0
fi

# 6. Determine target repo
if ! command -v gh >/dev/null 2>&1; then
  color_red "ERROR: gh CLI not found. Install: brew install gh"
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) || {
  color_red "ERROR: not in a GitHub repo (or gh not authenticated)"
  echo "cd into the sudoku-cc repo and try again."
  exit 1
}

if [ "$MODE" = "--auto" ]; then
  echo "Target repo: $(color_yellow "$REPO")"
  echo "Secret name: $(color_yellow "$SECRET_NAME")"
  read -r -p "Upload? [y/N] " confirm
  case "$confirm" in
    y|Y|yes|Yes) ;;
    *) echo "Aborted."; exit 1 ;;
  esac

  gh secret set "$SECRET_NAME" --repo "$REPO" --body "$(cat "$AUTH_FILE")"
  color_green "✅ Secret '$SECRET_NAME' updated in $REPO."
  echo
  echo "Verify: open the next PR or push to an existing one. Codex review"
  echo "should run within ~5 min and post a tagged 🤖 Codex Review comment."
  exit 0
fi

# Default: print manual instructions
cat <<EOF
$(color_dim "═══════════════════════════════════════════════════════════════")
Manual upload (default):
$(color_dim "═══════════════════════════════════════════════════════════════")

1. Open settings page:
   $(color_yellow "https://github.com/$REPO/settings/secrets/actions")

2. Find $(color_yellow "$SECRET_NAME") in the list.
   - If it exists: click "Update".
   - If not: click "New repository secret", name it $(color_yellow "$SECRET_NAME").

3. Paste the contents of $AUTH_FILE as the value.

4. Click "Add secret" / "Update secret".

$(color_dim "─── Quick copy to clipboard ───")
EOF

if command -v pbcopy >/dev/null 2>&1; then
  cat "$AUTH_FILE" | pbcopy
  color_green "✅ Contents of auth.json copied to clipboard (macOS pbcopy)."
elif command -v xclip >/dev/null 2>&1; then
  cat "$AUTH_FILE" | xclip -selection clipboard
  color_green "✅ Contents of auth.json copied to clipboard (Linux xclip)."
else
  echo "Run manually:  cat $AUTH_FILE | pbcopy   # or  xclip -selection clipboard"
fi

echo
color_dim "Or run with --auto to upload directly via gh CLI:"
color_dim "  scripts/codex-auth-refresh.sh --auto"
echo
