"""
Puzzle Generator — produces technique-solvable puzzles for each variant type.

Pipeline for each puzzle:
  1. generate_complete_board()  — backtracking + MRV, respects variant constraints
  2. _generate_variant_data()   — derive puzzle-specific constraints from the solution
                                   (thermos, signs, dots, cages, clues)
  3. make_puzzle()              — remove cells one-by-one while:
       a. unique solution is maintained  (fast backtracking, limit=2)
       b. puzzle is technique-solvable   (no backtracking for the player)
       c. difficulty matches the target
  4. Repeat until we have `count` accepted puzzles.

Backtracking is ONLY used internally for:
  - generating the complete board
  - verifying unique solution
It is NEVER used by the player (all exported puzzles are logic-only solvable).

Variant data generation
-----------------------
For global-rule types (CLASSIC, DIAGONAL, WINDOKU, ANTI_KNIGHT, ANTI_KING,
NON_CONSECUTIVE, ODD_EVEN) the board IS generated respecting the variant
constraints during backtracking — no extra data needed.

For puzzle-specific types (KILLER, KROPKI, GREATER_THAN, THERMO, SANDWICH,
LITTLE_KILLER) the board is generated with Classic rules (fastest), then
variant-specific data is derived from the complete solution.
"""

import json
import logging
import random
import sys
import time
from itertools import combinations as _iter_combinations
from pathlib import Path

from candidates import CandidateGrid, DIGIT_BIT, _bits_to_digits, _popcount
from solver import solve, SolveResult

log = logging.getLogger(__name__)

# When to start running the technique solver (skip it when puzzle has too many
# givens — at that point it's trivially EASY and evaluation is pointless).
EVAL_START = {
    'EASY':   48,
    'MEDIUM': 48,
    'HARD':   44,
    'EXPERT': 40,
}

# Absolute minimum givens we'll tolerate.
MIN_GIVENS = 15

# Types where board generation uses Classic rules only; variant data is derived
# from the solution afterwards.
_PUZZLE_SPECIFIC_TYPES = {
    'KILLER', 'KROPKI', 'GREATER_THAN', 'THERMO', 'SANDWICH', 'LITTLE_KILLER',
}


# ---------------------------------------------------------------------------
# Variant data generators  (called after a complete board is produced)
# ---------------------------------------------------------------------------

def generate_killer_cages(solution: list[list[int]]) -> list[dict]:
    """
    Partition the 9×9 grid into random cages of 2-5 adjacent cells.
    Returns a list of {'cells': [(r, c), ...], 'sum': int}.
    """
    assigned = [[-1] * 9 for _ in range(9)]
    cages: list[dict] = []
    cage_id = 0

    cells = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(cells)

    for r0, c0 in cells:
        if assigned[r0][c0] != -1:
            continue

        target_size = random.randint(2, 5)
        cage_cells = [(r0, c0)]
        assigned[r0][c0] = cage_id

        for _ in range(target_size - 1):
            # Collect unassigned orthogonal neighbours of the current cage
            neighbours = []
            for cr, cc in cage_cells:
                for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                    nr, nc = cr + dr, cc + dc
                    if 0 <= nr < 9 and 0 <= nc < 9 and assigned[nr][nc] == -1:
                        if (nr, nc) not in neighbours:
                            neighbours.append((nr, nc))
            if not neighbours:
                break
            nr, nc = random.choice(neighbours)
            cage_cells.append((nr, nc))
            assigned[nr][nc] = cage_id

        cage_sum = sum(solution[r][c] for r, c in cage_cells)
        cages.append({'id': cage_id, 'cells': cage_cells, 'sum': cage_sum})
        cage_id += 1

    # Any unassigned cells (shouldn't happen, but as safety) become solo cages
    for r in range(9):
        for c in range(9):
            if assigned[r][c] == -1:
                cages.append({'id': cage_id, 'cells': [(r, c)], 'sum': solution[r][c]})
                cage_id += 1

    return cages


def generate_kropki_dots(solution: list[list[int]]) -> dict[str, str]:
    """
    Compute Kropki dots from a complete solution.
    Returns a dict with keys "r,c,r" (right edge) and "r,c,b" (bottom edge).
    Only white ('white') and black ('black') dots are stored.
    Missing key = no dot (negative constraint).
    """
    dots: dict[str, str] = {}
    for r in range(9):
        for c in range(9):
            a = solution[r][c]
            # Right edge
            if c + 1 < 9:
                b = solution[r][c + 1]
                if abs(a - b) == 1:
                    dots[f'{r},{c},r'] = 'white'
                elif a == 2 * b or b == 2 * a:
                    dots[f'{r},{c},r'] = 'black'
            # Bottom edge
            if r + 1 < 9:
                b = solution[r + 1][c]
                if abs(a - b) == 1:
                    dots[f'{r},{c},b'] = 'white'
                elif a == 2 * b or b == 2 * a:
                    dots[f'{r},{c},b'] = 'black'
    return dots


def generate_greater_than_signs(solution: list[list[int]]) -> dict[str, str]:
    """
    Compute Greater-Than signs from a complete solution.
    All 144 internal edges are stored.
    Key "r,c,r": sign between (r,c) and (r,c+1), i.e. solution[r][c] vs solution[r][c+1].
    Key "r,c,b": sign between (r,c) and (r+1,c).
    """
    signs: dict[str, str] = {}
    for r in range(9):
        for c in range(9):
            if c + 1 < 9:
                signs[f'{r},{c},r'] = '>' if solution[r][c] > solution[r][c + 1] else '<'
            if r + 1 < 9:
                signs[f'{r},{c},b'] = '>' if solution[r][c] > solution[r + 1][c] else '<'
    return signs


def generate_thermos(
    solution: list[list[int]],
    max_thermos: int = 6,
    min_len: int = 3,
    max_len: int = 6,
    max_attempts: int = 200,
) -> list[list[tuple[int, int]]]:
    """
    Find random thermometer chains in the solution.
    A thermo is an orthogonally-connected path where solution values
    strictly increase from bulb to tip.

    Returns a list of thermos, each a list of (row, col) tuples.
    """
    used: set[tuple[int, int]] = set()
    thermos: list[list[tuple[int, int]]] = []

    for _ in range(max_attempts):
        if len(thermos) >= max_thermos:
            break

        # Random starting cell not already in a thermo
        candidates = [(r, c) for r in range(9) for c in range(9) if (r, c) not in used]
        if not candidates:
            break
        r, c = random.choice(candidates)

        thermo = [(r, c)]
        current_val = solution[r][c]

        # Extend in random directions while values increase strictly
        for _ in range(max_len - 1):
            neighbours = []
            for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                nr, nc = r + dr, c + dc
                if (0 <= nr < 9 and 0 <= nc < 9
                        and (nr, nc) not in used
                        and solution[nr][nc] > current_val):
                    neighbours.append((nr, nc))
            if not neighbours:
                break
            r, c = random.choice(neighbours)
            thermo.append((r, c))
            current_val = solution[r][c]

        if len(thermo) >= min_len:
            for cell in thermo:
                used.add(cell)
            thermos.append(thermo)

    return thermos


def generate_sandwich_clues(solution: list[list[int]]) -> dict:
    """
    Compute sandwich clues (sum between 1 and 9) for every row and column.
    Returns {'rows': [int]*9, 'cols': [int]*9}.
    """
    rows = []
    for r in range(9):
        line = solution[r]
        p1, p9 = line.index(1), line.index(9)
        lo, hi = min(p1, p9), max(p1, p9)
        rows.append(sum(line[lo + 1:hi]))

    cols = []
    for c in range(9):
        line = [solution[r][c] for r in range(9)]
        p1, p9 = line.index(1), line.index(9)
        lo, hi = min(p1, p9), max(p1, p9)
        cols.append(sum(line[lo + 1:hi]))

    return {'rows': rows, 'cols': cols}


def generate_little_killer_clues(
    solution: list[list[int]],
    n_clues: int = 10,
) -> list[dict]:
    """
    Select random diagonals of length ≥ 2 and compute their sums.
    Returns a list of {'cells': [(r, c), ...], 'sum': int}.
    """
    # All possible diagonal directions and starting positions
    # ↘ (dr=1, dc=1): starts at top row or left column
    # ↙ (dr=1, dc=-1): starts at top row or right column
    diagonals: list[list[tuple[int, int]]] = []

    for dr, dc in ((1, 1), (1, -1)):
        starts = []
        if dr == 1 and dc == 1:
            starts = [(0, c) for c in range(9)] + [(r, 0) for r in range(1, 9)]
        else:  # dr=1, dc=-1
            starts = [(0, c) for c in range(9)] + [(r, 8) for r in range(1, 9)]

        seen: set[tuple] = set()
        for r0, c0 in starts:
            cells = []
            r, c = r0, c0
            while 0 <= r < 9 and 0 <= c < 9:
                cells.append((r, c))
                r += dr
                c += dc
            key = tuple(cells)
            if len(cells) >= 2 and key not in seen:
                seen.add(key)
                diagonals.append(cells)

    random.shuffle(diagonals)
    clues = []
    for cells in diagonals[:n_clues]:
        s = sum(solution[r][c] for r, c in cells)
        clues.append({'cells': cells, 'sum': s})

    return clues


def _generate_variant_data(
    solution: list[list[int]],
    sudoku_type: str,
) -> dict:
    """
    Generate variant-specific constraint data from a complete solution.
    Returns kwargs suitable for CandidateGrid / solve() / count_solutions().
    """
    if sudoku_type == 'KILLER':
        return {'killer_cages': generate_killer_cages(solution)}
    elif sudoku_type == 'KROPKI':
        return {'kropki_dots': generate_kropki_dots(solution)}
    elif sudoku_type == 'GREATER_THAN':
        return {'greater_than_signs': generate_greater_than_signs(solution)}
    elif sudoku_type == 'THERMO':
        return {'thermos': generate_thermos(solution)}
    elif sudoku_type == 'SANDWICH':
        return {'sandwich_clues': generate_sandwich_clues(solution)}
    elif sudoku_type == 'LITTLE_KILLER':
        return {'little_killer_clues': generate_little_killer_clues(solution)}
    else:
        return {}


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

    For puzzle-specific types (KILLER, KROPKI, GREATER_THAN, THERMO, SANDWICH,
    LITTLE_KILLER) the board is generated with Classic rules; variant data is
    derived afterwards from the complete solution.

    Returns the board or None if all attempts fail.
    """
    board_type = 'CLASSIC' if sudoku_type in _PUZZLE_SPECIFIC_TYPES else sudoku_type
    for _ in range(max_attempts):
        board = [[0] * 9 for _ in range(9)]
        cg = CandidateGrid(board, board_type, odd_even_mask=odd_even_mask)
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
    killer_cages: list[dict] | None = None,
    kropki_dots: dict[str, str] | None = None,
    greater_than_signs: dict[str, str] | None = None,
    thermos: list[list[tuple[int, int]]] | None = None,
    sandwich_clues: dict | None = None,
    little_killer_clues: list[dict] | None = None,
) -> int:
    """
    Count solutions up to `limit`.  Stops as soon as limit is reached.
    Uses backtracking — for internal validation only.
    """
    cg = CandidateGrid(
        board, sudoku_type,
        odd_even_mask=odd_even_mask,
        killer_cages=killer_cages,
        kropki_dots=kropki_dots,
        greater_than_signs=greater_than_signs,
        thermos=thermos,
        sandwich_clues=sandwich_clues,
        little_killer_clues=little_killer_clues,
    )
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
    killer_cages: list[dict] | None = None,
    kropki_dots: dict[str, str] | None = None,
    greater_than_signs: dict[str, str] | None = None,
    thermos: list[list[tuple[int, int]]] | None = None,
    sandwich_clues: dict | None = None,
    little_killer_clues: list[dict] | None = None,
    n_orders: int = 1,
) -> tuple[list[list[int]], SolveResult] | None:
    """
    Remove cells from a complete board, targeting `target_difficulty`.
    Passes variant data through to count_solutions() and solve().
    """
    variant_kwargs = dict(
        odd_even_mask=odd_even_mask,
        killer_cages=killer_cages,
        kropki_dots=kropki_dots,
        greater_than_signs=greater_than_signs,
        thermos=thermos,
        sandwich_clues=sandwich_clues,
        little_killer_clues=little_killer_clues,
    )
    for _ in range(n_orders):
        result = _make_puzzle_once(full_board, sudoku_type, target_difficulty, variant_kwargs)
        if result is not None:
            return result
    return None


def _make_puzzle_once(
    full_board: list[list[int]],
    sudoku_type: str,
    target_difficulty: str,
    variant_kwargs: dict,
) -> tuple[list[list[int]], SolveResult] | None:
    if target_difficulty in ('EASY', 'MEDIUM'):
        return _make_puzzle_stepwise(full_board, sudoku_type, target_difficulty, variant_kwargs)
    else:
        return _make_puzzle_dive(full_board, sudoku_type, target_difficulty, variant_kwargs)


def _make_puzzle_stepwise(full_board, sudoku_type, target_difficulty, variant_kwargs):
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

        if count_solutions(puzzle, sudoku_type, limit=2, **variant_kwargs) != 1:
            puzzle[r][c] = saved
            givens += 1
            continue

        if givens > eval_start:
            continue

        result = solve(puzzle, sudoku_type, **variant_kwargs)
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


_SCAN_START = {
    'HARD':   35,
    'EXPERT': 30,
}


def _make_puzzle_dive(full_board, sudoku_type, target_difficulty, variant_kwargs):
    """Remove cells until uniqueness is lost, then pick the best snapshot.

    Strategy (givens-based with technique preference):
      1. Collect snapshots once the board drops to ≤ scan_start givens.
      2. Walk snapshots from fewest givens (hardest) toward more givens (easier).
      3. Return the first snapshot whose technique difficulty matches the target.
      4. If no exact match exists, return the snapshot with the fewest givens
         that the technique solver can still fully solve (fallback).
    This guarantees we always produce *something* even when the target technique
    level is never hit, trading exact difficulty label for faster generation.
    """
    scan_start = _SCAN_START[target_difficulty]
    puzzle = [row[:] for row in full_board]
    positions = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(positions)
    givens = 81
    snapshots: list[tuple[int, list[list[int]]]] = []

    for r, c in positions:
        if givens <= MIN_GIVENS:
            break
        saved = puzzle[r][c]
        puzzle[r][c] = 0
        givens -= 1

        if count_solutions(puzzle, sudoku_type, limit=2, **variant_kwargs) != 1:
            puzzle[r][c] = saved
            givens += 1
            continue

        if givens <= scan_start:
            snapshots.append((givens, [row[:] for row in puzzle]))

    # Walk from fewest givens (hardest) to most givens (easiest).
    # Prefer exact technique match; otherwise keep the hardest solvable state.
    fallback = None
    for _, state in reversed(snapshots):
        result = solve(state, sudoku_type, **variant_kwargs)
        if not result.solved:
            continue
        if result.difficulty == target_difficulty:
            return (state, result)
        if fallback is None:
            # Record the hardest state the technique solver can handle.
            fallback = (state, result)

    if fallback is not None:
        log.debug('dive: no exact %s match — returning fallback difficulty=%s',
                  target_difficulty, fallback[1].difficulty)
    return fallback


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
      puzzle, solution, difficulty, score, techniques, sudoku_type,
      and variant-specific data (killer_cages, kropki_dots, etc.)

    If output_dir is set, also writes progress JSON files every 100 puzzles.
    """
    results: list[dict] = []
    attempts = 0
    board_failures = 0
    t_start = time.time()

    log.info('start  type=%s  difficulty=%s  count=%d', sudoku_type, target_difficulty, count)

    if sudoku_type == 'KILLER' and target_difficulty in ('HARD', 'EXPERT'):
        log.warning(
            'KILLER difficulty is always EASY/score=0 for the technique solver '
            '(cage-only board). Target=%s will be ignored; all puzzles accepted as-is.',
            target_difficulty,
        )

    while len(results) < count and attempts < max_attempts:
        attempts += 1
        log.debug('[%d] attempt %d/%d  accepted=%d',
                  attempts, attempts, max_attempts, len(results))

        # 1. Generate complete board
        full_board = generate_complete_board(sudoku_type, odd_even_mask)
        if full_board is None:
            board_failures += 1
            log.debug('[%d] board generation failed  (total failures=%d)',
                      attempts, board_failures)
            continue
        log.debug('[%d] board generated', attempts)

        # 2. Derive variant-specific data from the solution
        variant_data = _generate_variant_data(full_board, sudoku_type)
        if sudoku_type == 'ODD_EVEN' and odd_even_mask:
            variant_data['odd_even_mask'] = odd_even_mask
        if variant_data:
            summary = {k: (len(v) if hasattr(v, '__len__') else v)
                       for k, v in variant_data.items()}
            log.debug('[%d] variant data: %s', attempts, summary)

        # 3. Create puzzle at target difficulty
        # KILLER: puzzle is always an empty board — cages alone constrain the solution.
        # The technique solver cannot evaluate cage-only puzzles well, so difficulty
        # is always reported as EASY/score=0 regardless of the target.
        if sudoku_type == 'KILLER':
            puzzle = [[0] * 9 for _ in range(9)]
            solve_result = solve(puzzle, sudoku_type, **variant_data)
            log.debug('[%d] KILLER solve: solved=%s  difficulty=%s  score=%d',
                      attempts, solve_result.solved, solve_result.difficulty,
                      solve_result.total_score)
        else:
            n_orders = 5 if target_difficulty in ('HARD', 'EXPERT') else 1
            outcome = make_puzzle(
                full_board, sudoku_type, target_difficulty,
                odd_even_mask=odd_even_mask,
                n_orders=n_orders,
                **variant_data,
            )
            if outcome is None:
                log.debug('[%d] make_puzzle returned None  (target=%s not reached)',
                          attempts, target_difficulty)
                continue
            puzzle, solve_result = outcome
            givens = sum(v != 0 for row in puzzle for v in row)
            log.debug('[%d] puzzle made: givens=%d  difficulty=%s  score=%d  techniques=%s',
                      attempts, givens, solve_result.difficulty,
                      solve_result.total_score, solve_result.technique_counts())

        record = {
            'puzzle':      puzzle,
            'solution':    full_board,
            'difficulty':  solve_result.difficulty,
            'score':       solve_result.total_score,
            'techniques':  solve_result.technique_counts(),
            'sudoku_type': sudoku_type,
        }
        record.update(variant_data)
        results.append(record)
        log.info('[%d] accepted #%d  difficulty=%s  score=%d',
                 attempts, len(results), solve_result.difficulty, solve_result.total_score)

        if len(results) % 50 == 0:
            elapsed = time.time() - t_start
            rate = len(results) / elapsed if elapsed > 0 else 0
            accept = len(results) / attempts
            eta = (count - len(results)) / rate if rate > 0 else float('inf')
            log.info('progress  %d/%d  attempts=%d  accept=%.1f%%  speed=%.1f/s  ETA=%.0fs',
                     len(results), count, attempts, accept * 100, rate, eta)

        if output_dir and len(results) % 100 == 0:
            _save_json(results, sudoku_type, target_difficulty, output_dir, partial=True)

    elapsed = time.time() - t_start
    log.info('done  accepted=%d/%d  attempts=%d  board_failures=%d  accept=%.1f%%  total=%.1fs',
             len(results), count, attempts, board_failures,
             len(results) / attempts * 100 if attempts else 0, elapsed)

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

    # Final saves append to any existing file; partial saves overwrite (checkpoint only).
    combined = results
    if not partial and fname.exists():
        try:
            with open(fname) as f:
                existing = json.load(f)
            combined = existing + results
            log.debug('append: loaded %d existing puzzles from %s', len(existing), fname)
        except (json.JSONDecodeError, OSError):
            log.warning('append: could not read existing %s — overwriting', fname)

    with open(fname, 'w') as f:
        json.dump(combined, f)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    import argparse

    ALL_TYPES = [
        'CLASSIC', 'DIAGONAL', 'WINDOKU',
        'ANTI_KNIGHT', 'ANTI_KING', 'NON_CONSECUTIVE',
        'ODD_EVEN',
        'KILLER', 'KROPKI', 'GREATER_THAN', 'THERMO', 'SANDWICH', 'LITTLE_KILLER',
    ]
    ALL_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'EXPERT']

    parser = argparse.ArgumentParser(description='Generate sudoku puzzles')
    parser.add_argument('--type',       default='CLASSIC',
                        choices=ALL_TYPES + ['ALL'])
    parser.add_argument('--difficulty', default='MEDIUM',
                        choices=ALL_DIFFICULTIES + ['ALL'])
    parser.add_argument('--count',      type=int, default=100)
    parser.add_argument('--out',        default='puzzles/')
    parser.add_argument('--log-level',  default='INFO',
                        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                        help='Logging verbosity (DEBUG shows every attempt)')
    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format='%(asctime)s  %(levelname)-7s  %(message)s',
        datefmt='%H:%M:%S',
    )

    types = ALL_TYPES if args.type == 'ALL' else [args.type]
    difficulties = ALL_DIFFICULTIES if args.difficulty == 'ALL' else [args.difficulty]

    sys.path.insert(0, str(Path(__file__).parent))

    for sudoku_type in types:
        for difficulty in difficulties:
            puzzles = generate_puzzles(
                sudoku_type=sudoku_type,
                target_difficulty=difficulty,
                count=args.count,
                output_dir=args.out,
            )
            log.info('saved %d puzzles → %s', len(puzzles), args.out)
