#!/usr/bin/env bash
#
# pr-watcher.test.sh — regression test for #225 (silent cursor advance
# on gh api failure). Runs poll_once with a mocked `gh` shim and
# asserts cursor-advance semantics.
#
# Usage: ./scripts/pr-watcher.test.sh
# Exit 0 = all assertions passed; nonzero = a failure (printed to stderr).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PR_WATCHER="$SCRIPT_DIR/pr-watcher.sh"

# Each test gets a fresh inbox + a fresh fake-gh on PATH.
make_sandbox() {
  local sandbox; sandbox=$(mktemp -d -t pr-watcher-test.XXXX)
  mkdir -p "$sandbox/inbox/cursors" "$sandbox/bin"
  echo "$sandbox"
}

# Build a fake gh that replays canned responses for the URLs/args we
# care about. $1 is the sandbox dir; the canonical fixture set is
# defined inline.
write_fake_gh() {
  local sandbox="$1"
  local mode="$2"  # "ok" | "fail-pulls" | "fail-comments"

  cat > "$sandbox/bin/gh" <<GHFAKE
#!/usr/bin/env bash
set -euo pipefail
ARGS="\$*"
case "\$ARGS" in
  *"repo view"*"nameWithOwner"*)
    echo "LeoMo42/sudoku-cc"
    exit 0
    ;;
  *"pr list"*)
    echo '[{"number": 99, "title": "test pr", "headRepositoryOwner": {"login": "LeoMo42"}, "headRepository": {"name": "sudoku-cc"}}]'
    exit 0
    ;;
  *"issues/99/comments"*)
    if [ "$mode" = "fail-comments" ]; then
      echo "fake gh: simulated comments failure" >&2
      exit 1
    fi
    # Empty events list — we're testing cursor semantics, not body parsing.
    exit 0
    ;;
  *"pulls/99/reviews"*)
    if [ "$mode" = "fail-pulls" ]; then
      echo "fake gh: simulated reviews failure" >&2
      exit 1
    fi
    exit 0
    ;;
esac
echo "fake gh: unhandled call: \$ARGS" >&2
exit 2
GHFAKE
  chmod +x "$sandbox/bin/gh"
}

run_poll() {
  local sandbox="$1"
  PATH="$sandbox/bin:$PATH" \
  PR_WATCHER_INBOX="$sandbox/inbox" \
    bash "$PR_WATCHER"
}

assert() {
  local cond="$1" msg="$2"
  if ! eval "$cond"; then
    echo "FAIL: $msg" >&2
    echo "  cond: $cond" >&2
    return 1
  fi
}

passes=0
fails=0

# Test 1: happy path — cursor file is created and contains a timestamp.
{
  sandbox=$(make_sandbox)
  write_fake_gh "$sandbox" "ok"
  run_poll "$sandbox" >/dev/null
  cursor_file="$sandbox/inbox/cursors/pr-99.txt"
  if assert "[ -f '$cursor_file' ]" "cursor file should exist after happy poll"; then
    cursor_value=$(cat "$cursor_file")
    if assert "[[ '$cursor_value' =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]]" "cursor should be ISO timestamp, got '$cursor_value'"; then
      ((passes++))
      echo "PASS: happy path advances cursor"
    else
      ((fails++))
    fi
  else
    ((fails++))
  fi
  rm -rf "$sandbox"
}

# Test 2: gh api fails on the comments call — cursor must NOT exist
# (regression for #225). Pre-existing cursor would also stay frozen,
# which we cover in test 3.
{
  sandbox=$(make_sandbox)
  write_fake_gh "$sandbox" "fail-comments"
  run_poll "$sandbox" >/dev/null 2>&1 || true  # poll_once returns 1 — that's the point
  cursor_file="$sandbox/inbox/cursors/pr-99.txt"
  if assert "[ ! -f '$cursor_file' ]" "cursor file must NOT exist after gh failure"; then
    ((passes++))
    echo "PASS: gh api comments failure does not create cursor"
  else
    ((fails++))
  fi
  rm -rf "$sandbox"
}

# Test 3: pre-existing cursor + gh failure — cursor stays frozen at
# its old value (this is the data-loss path: previously the code
# advanced cursor to "now", permanently skipping events between the
# old cursor and now).
{
  sandbox=$(make_sandbox)
  write_fake_gh "$sandbox" "fail-pulls"
  cursor_file="$sandbox/inbox/cursors/pr-99.txt"
  echo "2020-01-01T00:00:00Z" > "$cursor_file"
  run_poll "$sandbox" >/dev/null 2>&1 || true
  cursor_value=$(cat "$cursor_file")
  if assert "[ '$cursor_value' = '2020-01-01T00:00:00Z' ]" "cursor must remain frozen on gh reviews failure (got '$cursor_value')"; then
    ((passes++))
    echo "PASS: gh api reviews failure does not advance cursor"
  else
    ((fails++))
  fi
  rm -rf "$sandbox"
}

echo ""
echo "Passes: $passes  Fails: $fails"
[ "$fails" -eq 0 ]
