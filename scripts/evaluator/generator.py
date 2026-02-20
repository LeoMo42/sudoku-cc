"""
Puzzle Generator — produces technique-solvable puzzles for each variant type.

Pipeline for each puzzle:
  1. generate_complete_board()  — backtracking + MRV, respects variant constraints
  2. make_puzzle()              — remove cells one-by-one while:
       a. unique solution is maintained  (fast backtracking, limit=2)
       b. puzzle is technique-solvable   (no backtracking for the player)
       c. difficulty matches the target
  3. Repeat until we have `count` accepted puzzles.

Backtracking is ONLY used internally for:
  - generating the complete board
  - verifying unique solution
It is NEVER used by the player (all exported puzzles are logic-only solvable).
"""

import json
import random
import sys
import time
from pathlib import Path

from candidates import CandidateGrid, DIGIT_BIT, _bits_to_digits, _popcount
from solver import solve, SolveResult

# When to start running the technique solver (skip it when puzzle has too many
# givens — at that point it's trivially EASY and evaluation is pointless).
# These are universal starting points; variants may need fewer givens to
# reach the target difficulty, so we let the loop continue below these.
EVAL_START = {
    'EASY':   48,   # start checking for EASY once ≤48 givens remain
    'MEDIUM': 48,
    'HARD':   44,
    'EXPERT': 40,
}

# Absolute minimum givens we'll tolerate.  Below this we stop regardless.
# Variant types can legitimately go lower than classic (extra constraints
# substitute for given cells), so we use a conservative floor.
MIN_GIVENS = 15


# ---------------------------------------------------------------------------
# Complete board generator
# ---------------------------------------------------------------------------

def generate_complete_board(
    sudoku_type: str,
    odd_even_mask: list[list[str]] | None = None,
    max_attempts: int = 20,
) -> list[list[int]] | None:
    """
    Generate a fully-filled valid board for the given sudoku type.
    Uses randomised backtracking with MRV (Minimum Remaining Values) heuristic.
    Returns the board or None if all attempts fail.
    """
    for _ in range(max_attempts):
        board = [[0] * 9 for _ in range(9)]
        cg = CandidateGrid(board, sudoku_type, odd_even_mask)
        if _fill(cg):
            return cg.board
    return None


def _fill(cg: CandidateGrid) -> bool:
    """
    Recursive backtracking fill.  Modifies `cg` in-place.
    State is saved/restored on each call so the caller can retry.
    """
    # Find empty cell with fewest candidates (MRV)
    best_r, best_c, best_n = -1, -1, 10
    for r in range(9):
        for c in range(9):
            if cg.is_empty(r, c):
                n = cg.candidate_count(r, c)
                if n == 0:
                    return False  # dead end
                if n < best_n:
                    best_n, best_r, best_c = n, r, c
                    if n == 1:
                        break   # can't do better
        if best_n == 1:
            break

    if best_r == -1:
        return True  # all cells filled

    digits = cg.candidates(best_r, best_c)
    random.shuffle(digits)

    for digit in digits:
        # Save minimal state (just the grid + board arrays)
        saved_grid  = [row[:] for row in cg.grid]
        saved_board = [row[:] for row in cg.board]

        cg.place(best_r, best_c, digit)

        if not cg.has_contradiction() and _fill(cg):
            return True

        cg.grid  = saved_grid
        cg.board = saved_board

    return False


# ---------------------------------------------------------------------------
# Unique-solution checker  (backtracking — internal validation only)
# ---------------------------------------------------------------------------

def count_solutions(
    board: list[list[int]],
    sudoku_type: str,
    limit: int = 2,
    odd_even_mask: list[list[str]] | None = None,
) -> int:
    """
    Count solutions up to `limit`.  Stops as soon as limit is reached.
    Uses backtracking — for internal validation only.
    """
    cg = CandidateGrid(board, sudoku_type, odd_even_mask)
    if cg.has_contradiction():
        return 0
    counter = [0]
    _count_recursive(cg, counter, limit)
    return counter[0]


def _count_recursive(cg: CandidateGrid, counter: list[int], limit: int) -> None:
    if counter[0] >= limit:
        return

    if cg.is_solved():
        counter[0] += 1
        return

    # MRV
    best_r, best_c, best_n = -1, -1, 10
    for r in range(9):
        for c in range(9):
            if cg.is_empty(r, c):
                n = cg.candidate_count(r, c)
                if n == 0:
                    return  # dead end
                if n < best_n:
                    best_n, best_r, best_c = n, r, c
                    if n == 1:
                        break
        if best_n == 1:
            break

    if best_r == -1:
        return

    for digit in cg.candidates(best_r, best_c):
        if counter[0] >= limit:
            return
        saved_grid  = [row[:] for row in cg.grid]
        saved_board = [row[:] for row in cg.board]
        cg.place(best_r, best_c, digit)
        if not cg.has_contradiction():
            _count_recursive(cg, counter, limit)
        cg.grid  = saved_grid
        cg.board = saved_board


# ---------------------------------------------------------------------------
# Puzzle maker — cell removal with difficulty targeting
# ---------------------------------------------------------------------------

def make_puzzle(
    full_board: list[list[int]],
    sudoku_type: str,
    target_difficulty: str,
    odd_even_mask: list[list[str]] | None = None,
    n_orders: int = 1,
) -> tuple[list[list[int]], SolveResult] | None:
    """
    Remove cells from a complete board, targeting `target_difficulty`.

    Strategy:
      - Shuffle all positions randomly.
      - Remove each cell only if the puzzle keeps a unique solution.
      - Once below EVAL_START, evaluate difficulty after every removal.
      - If the puzzle becomes unsolvable by techniques, restore that cell
        and try the next one (the player must never need to guess).
      - Accept the first puzzle whose difficulty == target_difficulty.
      - Stop when givens drop below MIN_GIVENS or all positions are tried.

    Variant types (Anti-Knight, Non-Consecutive …) often need fewer givens
    than classic to reach a given difficulty — we let the loop go as low
    as MIN_GIVENS without an artificial floor.

    Returned puzzle is guaranteed:
      - Unique solution.
      - Technique-solvable (no backtracking for the player).
      - difficulty == target_difficulty.

    n_orders : how many random removal orderings to try on this board.
               Increasing this multiplies the chance of hitting HARD/EXPERT
               without needing to regenerate the underlying board.
    """
    for _ in range(n_orders):
        result = _make_puzzle_once(full_board, sudoku_type, target_difficulty, odd_even_mask)
        if result is not None:
            return result
    return None


def _make_puzzle_once(
    full_board: list[list[int]],
    sudoku_type: str,
    target_difficulty: str,
    odd_even_mask: list[list[str]] | None = None,
) -> tuple[list[list[int]], SolveResult] | None:
    """
    Two-phase strategy:

    EASY / MEDIUM — step-by-step:
      Remove cells one at a time, evaluating after each.  Restore if the
      puzzle becomes unsolvable by techniques.  Accept at first match.

    HARD / EXPERT — dive-then-evaluate:
      Remove cells freely (unique-solution check only) down to a target
      givens range, then evaluate once.  This avoids the trap of restoring
      cells that are necessary stepping-stones to harder patterns.
      Try multiple random target depths within the range.
    """
    if target_difficulty in ('EASY', 'MEDIUM'):
        return _make_puzzle_stepwise(full_board, sudoku_type, target_difficulty, odd_even_mask)
    else:
        return _make_puzzle_dive(full_board, sudoku_type, target_difficulty, odd_even_mask)


def _make_puzzle_stepwise(
    full_board, sudoku_type, target_difficulty, odd_even_mask
):
    """Step-by-step removal with technique check after each cell."""
    eval_start = EVAL_START[target_difficulty]
    puzzle = [row[:] for row in full_board]
    positions = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(positions)
    best_match = None
    givens = 81

    for r, c in positions:
        if givens <= MIN_GIVENS:
            break
        saved = puzzle[r][c]
        puzzle[r][c] = 0
        givens -= 1

        if count_solutions(puzzle, sudoku_type, limit=2, odd_even_mask=odd_even_mask) != 1:
            puzzle[r][c] = saved
            givens += 1
            continue

        if givens > eval_start:
            continue

        result = solve(puzzle, sudoku_type, odd_even_mask)
        if not result.solved:
            puzzle[r][c] = saved
            givens += 1
            continue

        if result.difficulty == target_difficulty:
            best_match = ([row[:] for row in puzzle], result)
            if target_difficulty == 'EASY':
                return best_match
        elif best_match is not None and _level_index(result.difficulty) > _level_index(target_difficulty):
            return best_match

    return best_match


# When to start scanning for HARD/EXPERT (skip evaluations above this)
_SCAN_START = {
    'HARD':   35,
    'EXPERT': 30,
}


def _make_puzzle_dive(
    full_board, sudoku_type, target_difficulty, odd_even_mask
):
    """
    Remove cells freely (unique-solution check only), then scan ALL reachable
    states from deepest to shallowest.  Return the first one whose difficulty
    matches the target.

    This avoids the trap of the step-by-step approach (restoring cells that
    are stepping-stones toward harder patterns) while still finding the right
    givens level without guessing a target depth.
    """
    scan_start = _SCAN_START[target_difficulty]

    puzzle = [row[:] for row in full_board]
    positions = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(positions)
    givens = 81
    snapshots: list[tuple[int, list[list[int]]]] = []  # (givens, puzzle_copy)

    for r, c in positions:
        if givens <= MIN_GIVENS:
            break
        saved = puzzle[r][c]
        puzzle[r][c] = 0
        givens -= 1

        if count_solutions(puzzle, sudoku_type, limit=2, odd_even_mask=odd_even_mask) != 1:
            puzzle[r][c] = saved
            givens += 1
            continue

        if givens <= scan_start:
            snapshots.append((givens, [row[:] for row in puzzle]))

    # Evaluate from fewest givens upward — harder puzzles tend to have fewer
    for _, state in reversed(snapshots):
        result = solve(state, sudoku_type, odd_even_mask)
        if result.solved and result.difficulty == target_difficulty:
            return (state, result)

    return None


def _level_index(level: str) -> int:
    return ['EASY', 'MEDIUM', 'HARD', 'EXPERT'].index(level)


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_puzzles(
    sudoku_type: str,
    target_difficulty: str,
    count: int = 1000,
    max_attempts: int = 20_000,
    odd_even_mask: list[list[str]] | None = None,
    output_dir: str | None = None,
    verbose: bool = True,
) -> list[dict]:
    """
    Generate `count` puzzles of `sudoku_type` at `target_difficulty`.

    Returns a list of dicts with keys:
      puzzle, solution, difficulty, score, techniques, sudoku_type

    If output_dir is set, also writes progress JSON files every 100 puzzles.
    """
    results: list[dict] = []
    attempts = 0
    board_failures = 0
    t_start = time.time()

    while len(results) < count and attempts < max_attempts:
        attempts += 1

        # 1. Generate complete board
        full_board = generate_complete_board(sudoku_type, odd_even_mask)
        if full_board is None:
            board_failures += 1
            continue

        # 2. Create puzzle at target difficulty
        # For harder targets, try multiple removal orderings per board
        n_orders = 5 if target_difficulty in ('HARD', 'EXPERT') else 1
        outcome = make_puzzle(full_board, sudoku_type, target_difficulty, odd_even_mask, n_orders)
        if outcome is None:
            continue

        puzzle, solve_result = outcome
        results.append({
            'puzzle':     puzzle,
            'solution':   full_board,
            'difficulty': solve_result.difficulty,
            'score':      solve_result.total_score,
            'techniques': solve_result.technique_counts(),
            'sudoku_type': sudoku_type,
        })

        if verbose and len(results) % 50 == 0:
            elapsed = time.time() - t_start
            rate = len(results) / elapsed if elapsed > 0 else 0
            accept = len(results) / attempts
            eta = (count - len(results)) / rate if rate > 0 else float('inf')
            print(
                f'  [{sudoku_type} / {target_difficulty}] '
                f'{len(results)}/{count}  '
                f'attempts={attempts}  '
                f'accept={accept:.1%}  '
                f'speed={rate:.1f}/s  '
                f'ETA={eta:.0f}s'
            )

        # Save intermediate progress
        if output_dir and len(results) % 100 == 0:
            _save_json(results, sudoku_type, target_difficulty, output_dir, partial=True)

    if verbose:
        elapsed = time.time() - t_start
        print(
            f'  Done: {len(results)}/{count} puzzles  '
            f'attempts={attempts}  '
            f'board_failures={board_failures}  '
            f'accept={len(results)/attempts:.1%}  '
            f'total={elapsed:.1f}s'
        )

    if output_dir:
        _save_json(results, sudoku_type, target_difficulty, output_dir, partial=False)

    return results


def _save_json(
    results: list[dict],
    sudoku_type: str,
    difficulty: str,
    output_dir: str,
    partial: bool = False,
) -> None:
    path = Path(output_dir)
    path.mkdir(parents=True, exist_ok=True)
    suffix = '_partial' if partial else ''
    fname = path / f'{sudoku_type.lower()}_{difficulty.lower()}{suffix}.json'
    with open(fname, 'w') as f:
        json.dump(results, f)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Generate sudoku puzzles')
    parser.add_argument('--type',       default='ANTI_KNIGHT',
                        choices=['CLASSIC', 'DIAGONAL', 'WINDOKU',
                                 'ANTI_KNIGHT', 'ANTI_KING', 'NON_CONSECUTIVE'])
    parser.add_argument('--difficulty', default='MEDIUM',
                        choices=['EASY', 'MEDIUM', 'HARD', 'EXPERT'])
    parser.add_argument('--count',      type=int, default=100)
    parser.add_argument('--out',        default='puzzles/')
    args = parser.parse_args()

    print(f'Generating {args.count} {args.type} / {args.difficulty} puzzles...')
    sys.path.insert(0, str(Path(__file__).parent))

    puzzles = generate_puzzles(
        sudoku_type=args.type,
        target_difficulty=args.difficulty,
        count=args.count,
        output_dir=args.out,
    )
    print(f'Saved {len(puzzles)} puzzles to {args.out}')
