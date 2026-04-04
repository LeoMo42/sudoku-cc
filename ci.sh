#!/usr/bin/env bash
# ci.sh — run all evaluator tests
# Usage: ./ci.sh [pytest options]
#   ./ci.sh                  # run all tests
#   ./ci.sh -v               # verbose
#   ./ci.sh -k test_solver   # filter by name
#   ./ci.sh --tb=short       # short traceback

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVALUATOR="$ROOT/evaluator"

echo "=== Sudoku Evaluator Tests ==="
echo "Root: $ROOT"
echo ""

# Check Python version
python3 --version

# Check pytest is available
if ! python3 -m pytest --version &>/dev/null; then
  echo "pytest not found. Install with: pip install pytest"
  exit 1
fi

# Run tests
# - rootdir is the evaluator dir so imports work
# - testpaths scoped to evaluator/tests
python3 -m pytest \
  "$EVALUATOR/tests/" \
  --rootdir="$EVALUATOR" \
  --tb=short \
  -q \
  "$@"

echo ""
echo "=== Done ==="
