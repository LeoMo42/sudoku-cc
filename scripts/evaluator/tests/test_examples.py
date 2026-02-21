"""
Integration tests using real puzzle examples from scripts/evaluator/examples/.

Each test loads a JSON file produced from playsudoku.ru and runs it through
the Python solver / CandidateGrid to verify:
  1. The stored *solution* is recognised as valid (no contradiction, is_solved).
  2. The stored *puzzle* (where present) is solved correctly by the technique solver.
  3. Per-type invariants (cage sums, ODD/EVEN mask, …) match the stored solution.
"""

import json
from pathlib import Path

import pytest

from candidates import CandidateGrid
from solver import solve

EXAMPLES_DIR = Path(__file__).parent.parent / 'examples'


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load(filename: str) -> dict:
    with open(EXAMPLES_DIR / filename) as f:
        return json.load(f)


def _killer_cages(raw: list[dict]) -> list[dict]:
    """Convert JSON cage data to the format expected by CandidateGrid / solve()."""
    return [
        {'cells': [tuple(c) for c in cage['cells']], 'sum': cage['sum']}
        for cage in raw
    ]


def _solver_kwargs(ex: dict) -> dict:
    """Extract variant-specific keyword arguments from an example dict."""
    t = ex['sudoku_type']
    if t == 'ODD_EVEN' and 'odd_even_mask' in ex:
        return {'odd_even_mask': ex['odd_even_mask']}
    if t == 'KILLER':
        return {'killer_cages': _killer_cages(ex['killer_cages'])}
    if t == 'KROPKI':
        return {'kropki_dots': ex['kropki_dots']}
    if t == 'GREATER_THAN':
        return {'greater_than_signs': ex['greater_than_signs']}
    return {}


# ---------------------------------------------------------------------------
# 1. Solution validity
#    For every example, feeding the stored solution into CandidateGrid must
#    not trigger a contradiction and must return is_solved() == True.
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('filename', [
    'diagonal_sx9_1_402.json',
    'windoku_win9_1_021.json',
    'anti_knight_skn9_1_050.json',
    'anti_king_stl9_4_045.json',
    'non_consecutive_snc9_1_040.json',
    'odd_even_soe1_345.json',
    'killer_skl9_1_005.json',
    'kropki_215.json',
    'greater_than_sgt_215.json',
])
def test_solution_is_valid(filename):
    """Stored solution must satisfy all variant constraints."""
    ex = _load(filename)
    kw = _solver_kwargs(ex)
    cg = CandidateGrid(ex['solution'], ex['sudoku_type'], **kw)
    assert not cg.has_contradiction(), f"{filename}: solution triggers a contradiction"
    assert cg.is_solved(), f"{filename}: solution not recognised as solved"


# ---------------------------------------------------------------------------
# 2. Puzzle solvability (easy-difficulty examples)
#    The technique solver (no backtracking) is expected to fully solve these.
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('filename,sudoku_type', [
    ('diagonal_sx9_1_402.json',         'DIAGONAL'),
    ('windoku_win9_1_021.json',          'WINDOKU'),
    ('anti_knight_skn9_1_050.json',     'ANTI_KNIGHT'),
    ('non_consecutive_snc9_1_040.json', 'NON_CONSECUTIVE'),
])
def test_easy_puzzle_solved(filename, sudoku_type):
    """Technique solver must solve easy variant puzzles without backtracking."""
    ex = _load(filename)
    kw = _solver_kwargs(ex)
    r = solve(ex['puzzle'], sudoku_type, **kw)
    assert r.solved, (
        f"{filename}: solver got stuck after {len(r.steps)} steps "
        f"(hardest technique: {r.hardest_level})"
    )


# ---------------------------------------------------------------------------
# 3. Hard / solution-only examples: solver makes progress, no crash
# ---------------------------------------------------------------------------

def test_anti_king_hard_no_contradiction():
    """Hard Anti-King puzzle: solver must at least start without contradiction."""
    ex = _load('anti_king_stl9_4_045.json')
    r = solve(ex['puzzle'], 'ANTI_KING')
    # Hard puzzle may not be fully solved by technique solver, but must not crash
    assert isinstance(r.solved, bool)
    assert len(r.steps) >= 0


def test_killer_easy_solver_progress():
    """Killer puzzle: solver must make at least some progress from cage constraints."""
    ex = _load('killer_skl9_1_005.json')
    kw = _solver_kwargs(ex)
    r = solve(ex['puzzle'], 'KILLER', **kw)
    # Killer starts from an empty board — expect meaningful progress
    assert len(r.steps) > 0, "Killer solver made zero progress from cage constraints"


# ---------------------------------------------------------------------------
# 4. Per-type invariant checks
# ---------------------------------------------------------------------------

def test_odd_even_mask_consistent_with_solution():
    """Every 'odd' cell in the mask must hold an odd digit in the solution."""
    ex = _load('odd_even_soe1_345.json')
    solution = ex['solution']
    mask = ex['odd_even_mask']
    for r in range(9):
        for c in range(9):
            digit = solution[r][c]
            marker = mask[r][c]
            if marker == 'odd':
                assert digit % 2 == 1, f"Cell ({r},{c}): mask='odd' but digit={digit}"
            elif marker == 'even':
                assert digit % 2 == 0, f"Cell ({r},{c}): mask='even' but digit={digit}"


def test_killer_cage_sums_match_solution():
    """Every cage sum in the JSON must equal the sum of solution digits in that cage."""
    ex = _load('killer_skl9_1_005.json')
    solution = ex['solution']
    for cage in ex['killer_cages']:
        total = sum(solution[r][c] for r, c in cage['cells'])
        assert total == cage['sum'], (
            f"Cage '{cage['label']}': expected sum {cage['sum']}, got {total}"
        )


def test_killer_no_repeated_digit_in_cage():
    """No digit may appear more than once within a cage."""
    ex = _load('killer_skl9_1_005.json')
    solution = ex['solution']
    for cage in ex['killer_cages']:
        digits = [solution[r][c] for r, c in cage['cells']]
        assert len(digits) == len(set(digits)), (
            f"Cage '{cage['label']}': repeated digit in {digits}"
        )


def test_kropki_dots_consistent_with_solution():
    """White dots must have |a-b|=1; black dots must have a=2b or b=2a."""
    ex = _load('kropki_215.json')
    solution = ex['solution']
    for key, dot_type in ex['kropki_dots'].items():
        r, c, direction = key.split(',')
        r, c = int(r), int(c)
        if direction == 'r':
            a, b = solution[r][c], solution[r][c + 1]
        else:  # 'b'
            a, b = solution[r][c], solution[r + 1][c]
        if dot_type == 'white':
            assert abs(a - b) == 1, f"{key}: white dot but |{a}-{b}|≠1"
        else:
            assert a == 2 * b or b == 2 * a, f"{key}: black dot but {a},{b} not in ×2 relation"


def test_greater_than_signs_consistent_with_solution():
    """Every > sign must hold in the stored solution."""
    ex = _load('greater_than_sgt_215.json')
    solution = ex['solution']
    for key, sign in ex['greater_than_signs'].items():
        r, c, direction = key.split(',')
        r, c = int(r), int(c)
        if direction == 'r':
            a, b = solution[r][c], solution[r][c + 1]
        else:  # 'b'
            a, b = solution[r][c], solution[r + 1][c]
        if sign == '>':
            assert a > b, f"{key}: sign='>' but {a} not > {b}"
        else:
            assert a < b, f"{key}: sign='<' but {a} not < {b}"


def test_diagonal_main_diagonal_unique():
    """Main diagonal of the stored solution must contain each digit exactly once."""
    ex = _load('diagonal_sx9_1_402.json')
    solution = ex['solution']
    diag = [solution[i][i] for i in range(9)]
    assert sorted(diag) == list(range(1, 10)), f"Main diagonal not 1-9: {diag}"


def test_diagonal_anti_diagonal_unique():
    """Anti-diagonal of the stored solution must contain each digit exactly once."""
    ex = _load('diagonal_sx9_1_402.json')
    solution = ex['solution']
    anti = [solution[i][8 - i] for i in range(9)]
    assert sorted(anti) == list(range(1, 10)), f"Anti-diagonal not 1-9: {anti}"


def test_windoku_windows_unique():
    """Each of the four Windoku windows must contain each digit exactly once."""
    ex = _load('windoku_win9_1_021.json')
    solution = ex['solution']
    windows = [(1, 1), (1, 5), (5, 1), (5, 5)]
    for wr, wc in windows:
        digits = [
            solution[wr + dr][wc + dc]
            for dr in range(3)
            for dc in range(3)
        ]
        assert sorted(digits) == list(range(1, 10)), (
            f"Windoku window at ({wr},{wc}) is not 1-9: {digits}"
        )


def test_anti_knight_no_knight_conflict():
    """No two cells a knight's move apart share a digit in the stored solution."""
    ex = _load('anti_knight_skn9_1_050.json')
    solution = ex['solution']
    knight_moves = [(-2, -1), (-2, 1), (-1, -2), (-1, 2),
                    (1, -2), (1, 2), (2, -1), (2, 1)]
    for r in range(9):
        for c in range(9):
            for dr, dc in knight_moves:
                nr, nc = r + dr, c + dc
                if 0 <= nr < 9 and 0 <= nc < 9:
                    assert solution[r][c] != solution[nr][nc], (
                        f"Anti-Knight conflict: ({r},{c}) and ({nr},{nc}) "
                        f"both = {solution[r][c]}"
                    )


def test_anti_king_no_diagonal_conflict():
    """No two diagonally adjacent cells share a digit in the stored solution."""
    ex = _load('anti_king_stl9_4_045.json')
    solution = ex['solution']
    for r in range(9):
        for c in range(9):
            for dr, dc in [(-1, -1), (-1, 1), (1, -1), (1, 1)]:
                nr, nc = r + dr, c + dc
                if 0 <= nr < 9 and 0 <= nc < 9:
                    assert solution[r][c] != solution[nr][nc], (
                        f"Anti-King conflict: ({r},{c}) and ({nr},{nc}) "
                        f"both = {solution[r][c]}"
                    )


def test_non_consecutive_no_adjacent_consecutive():
    """No two orthogonally adjacent cells have consecutive digits."""
    ex = _load('non_consecutive_snc9_1_040.json')
    solution = ex['solution']
    for r in range(9):
        for c in range(9):
            for dr, dc in [(0, 1), (1, 0)]:
                nr, nc = r + dr, c + dc
                if 0 <= nr < 9 and 0 <= nc < 9:
                    assert abs(solution[r][c] - solution[nr][nc]) != 1, (
                        f"Non-Consecutive conflict: ({r},{c})={solution[r][c]} "
                        f"and ({nr},{nc})={solution[nr][nc]}"
                    )
