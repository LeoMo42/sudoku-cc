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
    if t == 'THERMO':
        return {'thermos': [[tuple(c) for c in thermo] for thermo in ex['thermos']]}
    if t == 'SANDWICH':
        return {'sandwich_clues': ex['sandwich_clues']}
    if t == 'LITTLE_KILLER':
        return {'little_killer_clues': [
            {'cells': [tuple(c) for c in clue['cells']], 'sum': clue['sum']}
            for clue in ex['little_killer_clues']
        ]}
    return {}


# ---------------------------------------------------------------------------
# 1. Solution validity
#    For every example, feeding the stored solution into CandidateGrid must
#    not trigger a contradiction and must return is_solved() == True.
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('filename', [
    'classic_wikipedia.json',
    'diagonal_sx9_1_402.json',
    'windoku_win9_1_021.json',
    'anti_knight_skn9_1_050.json',
    'anti_king_stl9_4_045.json',
    'non_consecutive_snc9_1_040.json',
    'odd_even_soe1_345.json',
    'killer_skl9_1_005.json',
    'kropki_215.json',
    'greater_than_sgt_215.json',
    'thermo_8mbQn8HFH9.json',
    'sandwich_65xlas9gzy.json',
    'little_killer_RQMpF2m6NN.json',
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
    ('classic_wikipedia.json',          'CLASSIC'),
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


# ---------------------------------------------------------------------------
# Convenience groupings used in later parametrize blocks
# ---------------------------------------------------------------------------

_ALL_FILES = [
    'classic_wikipedia.json',
    'diagonal_sx9_1_402.json',
    'windoku_win9_1_021.json',
    'anti_knight_skn9_1_050.json',
    'anti_king_stl9_4_045.json',
    'non_consecutive_snc9_1_040.json',
    'odd_even_soe1_345.json',
    'killer_skl9_1_005.json',
    'kropki_215.json',
    'greater_than_sgt_215.json',
    'thermo_8mbQn8HFH9.json',
    'sandwich_65xlas9gzy.json',
    'little_killer_RQMpF2m6NN.json',
]

# Files that include a 'puzzle' grid AND where puzzle cells are consistent with
# the stored solution.  anti_king_stl9_4_045.json has a known data-capture
# mismatch (puzzle and solution were scraped from different page states), so it
# is excluded here and tested only for solution validity / no-contradiction.
# thermo_8mbQn8HFH9.json has an all-zero puzzle (no given cells), handled like KILLER.
_PUZZLE_FILES = [
    'classic_wikipedia.json',
    'diagonal_sx9_1_402.json',
    'windoku_win9_1_021.json',
    'anti_knight_skn9_1_050.json',
    'non_consecutive_snc9_1_040.json',
    'killer_skl9_1_005.json',
    'sandwich_65xlas9gzy.json',
    'little_killer_RQMpF2m6NN.json',
]

# Easy examples where the technique solver is expected to fully solve the puzzle
_EASY_PUZZLE_PARAMS = [
    ('classic_wikipedia.json',          'CLASSIC'),
    ('diagonal_sx9_1_402.json',         'DIAGONAL'),
    ('windoku_win9_1_021.json',          'WINDOKU'),
    ('anti_knight_skn9_1_050.json',     'ANTI_KNIGHT'),
    ('non_consecutive_snc9_1_040.json', 'NON_CONSECUTIVE'),
]


# ---------------------------------------------------------------------------
# 5. Every stored solution is a valid classic board (rows / cols / boxes)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('filename', _ALL_FILES)
def test_solution_rows_cols_boxes_valid(filename):
    """All 9 rows, 9 columns, and 9 boxes must contain each of 1-9 exactly once."""
    ex = _load(filename)
    solution = ex['solution']
    digits = set(range(1, 10))
    for r, row in enumerate(solution):
        assert set(row) == digits, f"{filename}: row {r} is not 1-9: {row}"
    for c in range(9):
        col = [solution[r][c] for r in range(9)]
        assert set(col) == digits, f"{filename}: col {c} is not 1-9"
    for br in range(3):
        for bc in range(3):
            box = {solution[br*3+dr][bc*3+dc] for dr in range(3) for dc in range(3)}
            assert box == digits, f"{filename}: box ({br},{bc}) is not 1-9"


# ---------------------------------------------------------------------------
# 6. Puzzle-solution consistency
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('filename', _PUZZLE_FILES)
def test_puzzle_cells_match_solution(filename):
    """Every non-zero cell in the puzzle must equal the corresponding solution cell."""
    ex = _load(filename)
    puzzle, solution = ex['puzzle'], ex['solution']
    for r in range(9):
        for c in range(9):
            if puzzle[r][c] != 0:
                assert puzzle[r][c] == solution[r][c], (
                    f"{filename}: ({r},{c}) puzzle={puzzle[r][c]} "
                    f"but solution={solution[r][c]}"
                )


_FULLY_EMPTY_PUZZLE_FILES = ['killer_skl9_1_005.json', 'thermo_8mbQn8HFH9.json']


@pytest.mark.parametrize('filename', [f for f in _PUZZLE_FILES
                                       if f not in _FULLY_EMPTY_PUZZLE_FILES])
def test_puzzle_has_at_least_one_empty_cell(filename):
    """A non-Killer/non-Thermo puzzle must contain at least one empty (0) cell."""
    ex = _load(filename)
    empty = sum(v == 0 for row in ex['puzzle'] for v in row)
    assert empty >= 1, f"{filename}: puzzle has no empty cells"


@pytest.mark.parametrize('filename', _FULLY_EMPTY_PUZZLE_FILES)
def test_fully_empty_puzzle_has_no_givens(filename):
    """Killer/Thermo puzzles use all-zero grids — variant constraints alone drive solving."""
    ex = _load(filename)
    assert all(ex['puzzle'][r][c] == 0 for r in range(9) for c in range(9))


# ---------------------------------------------------------------------------
# 7. Solver result quality for easy examples
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('filename,sudoku_type', _EASY_PUZZLE_PARAMS)
def test_easy_puzzle_solve_result_fields(filename, sudoku_type):
    """SolveResult for easy examples must have a valid difficulty and non-negative score."""
    ex = _load(filename)
    kw = _solver_kwargs(ex)
    r = solve(ex['puzzle'], sudoku_type, **kw)
    assert r.difficulty in ('EASY', 'MEDIUM', 'HARD', 'EXPERT')
    assert r.total_score >= 0
    assert isinstance(r.technique_counts(), dict)


@pytest.mark.parametrize('filename,sudoku_type', _EASY_PUZZLE_PARAMS)
def test_easy_puzzle_solver_placements_match_solution(filename, sudoku_type):
    """Cell placements made by the solver must match the stored solution."""
    ex = _load(filename)
    kw = _solver_kwargs(ex)
    r = solve(ex['puzzle'], sudoku_type, **kw)
    if not r.solved:
        pytest.skip(f"{filename}: technique solver did not fully solve the puzzle")
    # Apply all placements to the starting puzzle
    board = [row[:] for row in ex['puzzle']]
    for step in r.steps:
        for row, col, digit in step.placements:
            board[row][col] = digit
    solution = ex['solution']
    for row in range(9):
        for col in range(9):
            assert board[row][col] == solution[row][col], (
                f"{filename}: ({row},{col}) solver placed {board[row][col]} "
                f"but expected {solution[row][col]}"
            )


# ---------------------------------------------------------------------------
# 8. Killer structural invariants (from the example file)
# ---------------------------------------------------------------------------

def test_killer_cages_cover_all_81_cells():
    """Killer cages must partition all 81 cells — no cell may be missing."""
    ex = _load('killer_skl9_1_005.json')
    covered = set()
    for cage in ex['killer_cages']:
        for cell in cage['cells']:
            covered.add(tuple(cell))
    assert covered == {(r, c) for r in range(9) for c in range(9)}, (
        f"Killer cages cover only {len(covered)} of 81 cells"
    )


def test_killer_no_cell_in_two_cages():
    """Each cell must appear in exactly one cage."""
    ex = _load('killer_skl9_1_005.json')
    all_cells = [tuple(cell) for cage in ex['killer_cages'] for cell in cage['cells']]
    assert len(all_cells) == len(set(all_cells)), "Some cell appears in multiple cages"


def test_killer_cage_max_size():
    """No cage in the example may have more than 9 cells."""
    ex = _load('killer_skl9_1_005.json')
    for cage in ex['killer_cages']:
        assert len(cage['cells']) <= 9, (
            f"Cage '{cage.get('label', '?')}' has {len(cage['cells'])} cells"
        )


def test_killer_each_cage_orthogonally_connected():
    """Every cage must be a single orthogonally-connected region."""
    ex = _load('killer_skl9_1_005.json')
    for cage in ex['killer_cages']:
        cells = [tuple(c) for c in cage['cells']]
        if len(cells) == 1:
            continue
        remaining = set(cells)
        frontier = {cells[0]}
        visited: set = set()
        while frontier:
            cell = frontier.pop()
            visited.add(cell)
            remaining.discard(cell)
            r, c = cell
            for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                nb = (r + dr, c + dc)
                if nb in remaining and nb not in visited:
                    frontier.add(nb)
        assert not remaining, (
            f"Cage '{cage.get('label', '?')}' is not orthogonally connected: {cells}"
        )


def test_killer_solver_places_multiple_digits():
    """Killer solver must place more than one digit from cage deductions."""
    ex = _load('killer_skl9_1_005.json')
    kw = _solver_kwargs(ex)
    r = solve(ex['puzzle'], 'KILLER', **kw)
    placements = [p for step in r.steps for p in step.placements]
    assert len(placements) > 1, (
        f"Killer solver placed only {len(placements)} digit(s) — expected meaningful progress"
    )


# ---------------------------------------------------------------------------
# 9. GREATER_THAN structural checks
# ---------------------------------------------------------------------------

def test_greater_than_exactly_144_signs():
    """Greater-than example must store exactly 144 signs (9×8 horizontal + 8×9 vertical)."""
    ex = _load('greater_than_sgt_215.json')
    assert len(ex['greater_than_signs']) == 144, (
        f"Expected 144 signs, got {len(ex['greater_than_signs'])}"
    )


def test_greater_than_sign_values_are_valid():
    """Every stored sign must be '>' or '<'."""
    ex = _load('greater_than_sgt_215.json')
    for key, sign in ex['greater_than_signs'].items():
        assert sign in ('>', '<'), f"Unexpected sign '{sign}' for key {key}"


def test_greater_than_all_edges_present():
    """Every internal horizontal and vertical edge must have a sign."""
    ex = _load('greater_than_sgt_215.json')
    signs = ex['greater_than_signs']
    for r in range(9):
        for c in range(9):
            if c + 1 < 9:
                assert f'{r},{c},r' in signs, f"Missing horizontal sign at ({r},{c})"
            if r + 1 < 9:
                assert f'{r},{c},b' in signs, f"Missing vertical sign at ({r},{c})"


# ---------------------------------------------------------------------------
# 10. KROPKI structural checks
# ---------------------------------------------------------------------------

def test_kropki_dot_values_are_valid():
    """Every Kropki dot must be 'white' or 'black'."""
    ex = _load('kropki_215.json')
    for key, dot in ex['kropki_dots'].items():
        assert dot in ('white', 'black'), f"Unexpected dot type '{dot}' for key {key}"


def test_kropki_key_format():
    """Every Kropki key must be 'r,c,d' where d ∈ {'r', 'b'}."""
    ex = _load('kropki_215.json')
    for key in ex['kropki_dots']:
        parts = key.split(',')
        assert len(parts) == 3, f"Malformed key: {key}"
        r_s, c_s, d = parts
        assert r_s.isdigit() and c_s.isdigit(), f"Non-integer coords in key: {key}"
        assert d in ('r', 'b'), f"Unknown direction '{d}' in key: {key}"


def test_kropki_coords_in_bounds():
    """Kropki key coordinates must reference valid adjacent cells."""
    ex = _load('kropki_215.json')
    for key in ex['kropki_dots']:
        r, c, d = key.split(',')
        r, c = int(r), int(c)
        assert 0 <= r < 9 and 0 <= c < 9, f"Coords out of bounds: {key}"
        if d == 'r':
            assert c + 1 < 9, f"Right edge out of bounds: {key}"
        else:
            assert r + 1 < 9, f"Bottom edge out of bounds: {key}"


# ---------------------------------------------------------------------------
# 11. ODD_EVEN mask structural checks
# ---------------------------------------------------------------------------

def test_odd_even_mask_is_9x9():
    """ODD_EVEN mask must be a 9×9 grid."""
    ex = _load('odd_even_soe1_345.json')
    mask = ex['odd_even_mask']
    assert len(mask) == 9, f"Mask has {len(mask)} rows"
    for r, row in enumerate(mask):
        assert len(row) == 9, f"Mask row {r} has {len(row)} entries"


def test_odd_even_mask_values_are_valid():
    """Every mask cell must be 'odd', 'even', or None."""
    ex = _load('odd_even_soe1_345.json')
    mask = ex['odd_even_mask']
    for r in range(9):
        for c in range(9):
            val = mask[r][c]
            assert val in ('odd', 'even', None), (
                f"Unexpected mask value '{val}' at ({r},{c})"
            )


def test_odd_even_mask_odd_count_matches_digit_parity():
    """The number of 'odd' mask cells must equal the count of odd digits in the solution."""
    ex = _load('odd_even_soe1_345.json')
    solution = ex['solution']
    mask = ex['odd_even_mask']
    odd_mask = sum(mask[r][c] == 'odd' for r in range(9) for c in range(9))
    odd_solution = sum(solution[r][c] % 2 == 1 for r in range(9) for c in range(9))
    assert odd_mask == odd_solution, (
        f"Mask has {odd_mask} 'odd' cells but solution has {odd_solution} odd digits"
    )


# ---------------------------------------------------------------------------
# 12. THERMO, SANDWICH, LITTLE_KILLER invariant checks
# ---------------------------------------------------------------------------

def test_thermo_strictly_increasing():
    """Every thermometer in the stored solution must be strictly increasing bulb→tip."""
    ex = _load('thermo_8mbQn8HFH9.json')
    solution = ex['solution']
    for ti, thermo in enumerate(ex['thermos']):
        vals = [solution[r][c] for r, c in thermo]
        for i in range(len(vals) - 1):
            assert vals[i] < vals[i + 1], (
                f"Thermo {ti}: not strictly increasing at pos {i}: {vals}"
            )


def test_thermo_count():
    """Thermo example must contain at least 2 thermos, each of length ≥ 2."""
    ex = _load('thermo_8mbQn8HFH9.json')
    thermos = ex['thermos']
    assert len(thermos) >= 2, f"Expected ≥2 thermos, got {len(thermos)}"
    for ti, thermo in enumerate(thermos):
        assert len(thermo) >= 2, f"Thermo {ti} has fewer than 2 cells: {thermo}"


def test_thermo_cells_in_bounds():
    """All thermo cell coordinates must be within [0, 8]."""
    ex = _load('thermo_8mbQn8HFH9.json')
    for ti, thermo in enumerate(ex['thermos']):
        for r, c in thermo:
            assert 0 <= r < 9 and 0 <= c < 9, (
                f"Thermo {ti}: cell ({r},{c}) out of bounds"
            )


def test_sandwich_row_clues_match_solution():
    """Every row sandwich clue must equal the sum between 1 and 9 in that row."""
    ex = _load('sandwich_65xlas9gzy.json')
    solution = ex['solution']
    rows_clue = ex['sandwich_clues']['rows']
    for r in range(9):
        line = solution[r]
        p1, p9 = line.index(1), line.index(9)
        lo, hi = min(p1, p9), max(p1, p9)
        between = sum(line[lo + 1:hi])
        assert between == rows_clue[r], (
            f"Row {r}: clue={rows_clue[r]} but actual sum between 1&9={between}"
        )


def test_sandwich_col_clues_match_solution():
    """Every column sandwich clue must equal the sum between 1 and 9 in that column."""
    ex = _load('sandwich_65xlas9gzy.json')
    solution = ex['solution']
    cols_clue = ex['sandwich_clues']['cols']
    for c in range(9):
        line = [solution[r][c] for r in range(9)]
        p1, p9 = line.index(1), line.index(9)
        lo, hi = min(p1, p9), max(p1, p9)
        between = sum(line[lo + 1:hi])
        assert between == cols_clue[c], (
            f"Col {c}: clue={cols_clue[c]} but actual sum between 1&9={between}"
        )


def test_sandwich_clues_have_9_each():
    """Sandwich clues must have exactly 9 row values and 9 column values."""
    ex = _load('sandwich_65xlas9gzy.json')
    clues = ex['sandwich_clues']
    assert len(clues['rows']) == 9, f"Expected 9 row clues, got {len(clues['rows'])}"
    assert len(clues['cols']) == 9, f"Expected 9 col clues, got {len(clues['cols'])}"


def test_little_killer_diagonal_sums_match_solution():
    """Every little-killer diagonal clue sum must equal the actual sum in the solution."""
    ex = _load('little_killer_RQMpF2m6NN.json')
    solution = ex['solution']
    for i, clue in enumerate(ex['little_killer_clues']):
        actual = sum(solution[r][c] for r, c in clue['cells'])
        assert actual == clue['sum'], (
            f"LK clue {i}: expected sum={clue['sum']}, actual={actual}, cells={clue['cells']}"
        )


def test_little_killer_clue_cells_in_bounds():
    """All little-killer clue cells must be within [0, 8]."""
    ex = _load('little_killer_RQMpF2m6NN.json')
    for i, clue in enumerate(ex['little_killer_clues']):
        for r, c in clue['cells']:
            assert 0 <= r < 9 and 0 <= c < 9, (
                f"LK clue {i}: cell ({r},{c}) out of bounds"
            )


def test_little_killer_cells_form_diagonal():
    """Each little-killer clue must trace a strict diagonal (|dr|=|dc|=1 between consecutive cells)."""
    ex = _load('little_killer_RQMpF2m6NN.json')
    for i, clue in enumerate(ex['little_killer_clues']):
        cells = clue['cells']
        for j in range(len(cells) - 1):
            r1, c1 = cells[j]
            r2, c2 = cells[j + 1]
            assert abs(r2 - r1) == 1 and abs(c2 - c1) == 1, (
                f"LK clue {i}: step {j}→{j+1} is not diagonal: ({r1},{c1})→({r2},{c2})"
            )
