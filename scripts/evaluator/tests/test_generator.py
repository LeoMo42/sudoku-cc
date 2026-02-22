"""Tests for generator.py — board generation, variant data, and puzzle making.

Coverage:
  - generate_complete_board()   : shape, values, type-specific constraints
  - count_solutions()          : unique / non-unique / contradictory boards, limits
  - generate_killer_cages()    : coverage, sums, adjacency
  - generate_kropki_dots()     : white/black rules
  - generate_greater_than_signs(): count, correctness
  - generate_thermos()          : increasing values, adjacency
  - generate_sandwich_clues()   : sum correctness
  - generate_little_killer_clues(): diagonal sums
  - _generate_variant_data()    : routing to the right generator
  - make_puzzle()               : fewer givens, subset of solution, unique solution
  - _level_index()              : ordering
"""

import copy

import pytest

from generator import (
    EVAL_START,
    MIN_GIVENS,
    _PUZZLE_SPECIFIC_TYPES,
    _generate_variant_data,
    _level_index,
    count_solutions,
    generate_complete_board,
    generate_greater_than_signs,
    generate_killer_cages,
    generate_kropki_dots,
    generate_little_killer_clues,
    generate_puzzles,
    generate_sandwich_clues,
    generate_thermos,
    make_puzzle,
)
from solver import SolveResult


# ---------------------------------------------------------------------------
# Known valid complete classic board used as a deterministic fixture
# ---------------------------------------------------------------------------

COMPLETE_BOARD = [
    [5, 3, 4,  6, 7, 8,  9, 1, 2],
    [6, 7, 2,  1, 9, 5,  3, 4, 8],
    [1, 9, 8,  3, 4, 2,  5, 6, 7],
    [8, 5, 9,  7, 6, 1,  4, 2, 3],
    [4, 2, 6,  8, 5, 3,  7, 9, 1],
    [7, 1, 3,  9, 2, 4,  8, 5, 6],
    [9, 6, 1,  5, 3, 7,  2, 8, 4],
    [2, 8, 7,  4, 1, 9,  6, 3, 5],
    [3, 4, 5,  2, 8, 6,  1, 7, 9],
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_valid_complete_board(board: list[list[int]]) -> bool:
    """Check rows, columns and boxes each contain exactly 1-9."""
    digits = set(range(1, 10))
    for row in board:
        if set(row) != digits:
            return False
    for c in range(9):
        if {board[r][c] for r in range(9)} != digits:
            return False
    for br in range(3):
        for bc in range(3):
            box = {board[br * 3 + dr][bc * 3 + dc]
                   for dr in range(3) for dc in range(3)}
            if box != digits:
                return False
    return True


# ---------------------------------------------------------------------------
# generate_complete_board
# ---------------------------------------------------------------------------

class TestGenerateCompleteBoard:

    def test_returns_9x9(self):
        board = generate_complete_board('CLASSIC')
        assert board is not None
        assert len(board) == 9
        assert all(len(row) == 9 for row in board)

    def test_all_cells_filled(self):
        board = generate_complete_board('CLASSIC')
        assert board is not None
        assert all(board[r][c] != 0 for r in range(9) for c in range(9))

    def test_classic_is_valid(self):
        board = generate_complete_board('CLASSIC')
        assert board is not None
        assert _is_valid_complete_board(board)

    @pytest.mark.parametrize('sudoku_type', [
        'CLASSIC',
        'DIAGONAL',
        'WINDOKU',
        'ANTI_KNIGHT',
        'ANTI_KING',
        # Puzzle-specific types generate a classic board internally
        'KILLER', 'KROPKI', 'GREATER_THAN', 'THERMO', 'SANDWICH', 'LITTLE_KILLER',
    ])
    def test_standard_rows_cols_boxes_for_all_types(self, sudoku_type):
        """All types must produce boards valid by the classic row/column/box rule."""
        board = generate_complete_board(sudoku_type)
        assert board is not None
        assert _is_valid_complete_board(board), (
            f"{sudoku_type} board fails basic row/col/box check"
        )

    def test_non_consecutive_rows_cols_boxes(self):
        board = generate_complete_board('NON_CONSECUTIVE')
        assert board is not None
        assert _is_valid_complete_board(board)

    def test_diagonal_main_diagonal_unique(self):
        board = generate_complete_board('DIAGONAL')
        assert board is not None
        diag = [board[i][i] for i in range(9)]
        assert sorted(diag) == list(range(1, 10)), f"Main diagonal not 1-9: {diag}"

    def test_diagonal_anti_diagonal_unique(self):
        board = generate_complete_board('DIAGONAL')
        assert board is not None
        anti = [board[i][8 - i] for i in range(9)]
        assert sorted(anti) == list(range(1, 10)), f"Anti-diagonal not 1-9: {anti}"

    def test_windoku_all_windows_unique(self):
        board = generate_complete_board('WINDOKU')
        assert board is not None
        for wr, wc in [(1, 1), (1, 5), (5, 1), (5, 5)]:
            digits = [board[wr + dr][wc + dc] for dr in range(3) for dc in range(3)]
            assert sorted(digits) == list(range(1, 10)), (
                f"Windoku window at ({wr},{wc}) is not 1-9: {digits}"
            )

    def test_anti_knight_no_knight_conflicts(self):
        board = generate_complete_board('ANTI_KNIGHT')
        assert board is not None
        moves = [(-2, -1), (-2, 1), (-1, -2), (-1, 2),
                 (1, -2),  (1, 2),  (2, -1),  (2, 1)]
        for r in range(9):
            for c in range(9):
                for dr, dc in moves:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < 9 and 0 <= nc < 9:
                        assert board[r][c] != board[nr][nc], (
                            f"Anti-Knight conflict at ({r},{c}) and ({nr},{nc})"
                        )

    def test_anti_king_no_diagonal_conflicts(self):
        board = generate_complete_board('ANTI_KING')
        assert board is not None
        for r in range(9):
            for c in range(9):
                for dr, dc in [(-1, -1), (-1, 1), (1, -1), (1, 1)]:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < 9 and 0 <= nc < 9:
                        assert board[r][c] != board[nr][nc], (
                            f"Anti-King conflict at ({r},{c}) and ({nr},{nc})"
                        )

    def test_non_consecutive_no_adjacent_consecutive(self):
        board = generate_complete_board('NON_CONSECUTIVE')
        assert board is not None
        for r in range(9):
            for c in range(9):
                for dr, dc in [(0, 1), (1, 0)]:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < 9 and 0 <= nc < 9:
                        assert abs(board[r][c] - board[nr][nc]) != 1, (
                            f"Non-Consecutive conflict: ({r},{c})={board[r][c]} "
                            f"and ({nr},{nc})={board[nr][nc]}"
                        )

    def test_successive_calls_independent(self):
        """Two calls must return independent boards (no shared state)."""
        b1 = generate_complete_board('CLASSIC')
        b2 = generate_complete_board('CLASSIC')
        assert _is_valid_complete_board(b1)
        assert _is_valid_complete_board(b2)
        # Modifying one must not affect the other
        b1[0][0] = 0
        assert b2[0][0] != 0


# ---------------------------------------------------------------------------
# count_solutions
# ---------------------------------------------------------------------------

class TestCountSolutions:

    def test_complete_board_has_one_solution(self):
        n = count_solutions(COMPLETE_BOARD, 'CLASSIC', limit=2)
        assert n == 1

    def test_contradictory_board_has_zero_solutions(self):
        # Cell (0,8) is empty and needs 9 (row 0 has 1-8).
        # Column 8 already contains 9 → no candidates for (0,8) → contradiction.
        board = [[0] * 9 for _ in range(9)]
        board[0] = [1, 2, 3, 4, 5, 6, 7, 8, 0]  # (0,8) empty, only 9 possible
        board[1][8] = 9  # blocks 9 from (0,8) via column constraint
        n = count_solutions(board, 'CLASSIC', limit=2)
        assert n == 0

    def test_single_empty_cell_has_one_solution(self):
        board = copy.deepcopy(COMPLETE_BOARD)
        board[8][8] = 0
        n = count_solutions(board, 'CLASSIC', limit=2)
        assert n == 1

    def test_empty_board_returns_limit_when_many_solutions(self):
        empty = [[0] * 9 for _ in range(9)]
        n = count_solutions(empty, 'CLASSIC', limit=2)
        assert n == 2   # hits the limit; many more exist

    def test_limit_one_on_empty_board(self):
        empty = [[0] * 9 for _ in range(9)]
        n = count_solutions(empty, 'CLASSIC', limit=1)
        assert n == 1   # stops after finding one

    def test_max_nodes_returns_minus_one_on_empty_board(self):
        empty = [[0] * 9 for _ in range(9)]
        n = count_solutions(empty, 'CLASSIC', limit=2, max_nodes=1)
        assert n == -1  # node budget exhausted immediately

    def test_complete_board_within_node_budget(self):
        n = count_solutions(COMPLETE_BOARD, 'CLASSIC', limit=2, max_nodes=100_000)
        assert n == 1   # budget ample for a fully-filled board

    def test_nearly_complete_board_unique(self):
        board = copy.deepcopy(COMPLETE_BOARD)
        board[0][0] = 0
        board[4][4] = 0
        n = count_solutions(board, 'CLASSIC', limit=2)
        assert n == 1


# ---------------------------------------------------------------------------
# generate_killer_cages
# ---------------------------------------------------------------------------

class TestGenerateKillerCages:

    def setup_method(self):
        self.cages = generate_killer_cages(COMPLETE_BOARD)

    def test_returns_list(self):
        assert isinstance(self.cages, list)

    def test_all_81_cells_covered(self):
        all_cells = set()
        for cage in self.cages:
            for cell in cage['cells']:
                all_cells.add(tuple(cell))
        assert all_cells == {(r, c) for r in range(9) for c in range(9)}

    def test_no_cell_in_two_cages(self):
        all_cells = []
        for cage in self.cages:
            for cell in cage['cells']:
                all_cells.append(tuple(cell))
        assert len(all_cells) == len(set(all_cells))

    def test_cage_sums_match_solution(self):
        for cage in self.cages:
            expected = sum(COMPLETE_BOARD[r][c] for r, c in cage['cells'])
            assert cage['sum'] == expected

    def test_cage_sizes_at_most_5(self):
        for cage in self.cages:
            assert 1 <= len(cage['cells']) <= 5

    def test_each_cage_orthogonally_connected(self):
        for cage in self.cages:
            cells = [tuple(c) for c in cage['cells']]
            if len(cells) == 1:
                continue
            # BFS connectivity check
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
                f"Cage {cage.get('id')} is not orthogonally connected: {cage['cells']}"
            )

    def test_each_cage_has_required_fields(self):
        for cage in self.cages:
            assert 'cells' in cage
            assert 'sum' in cage


# ---------------------------------------------------------------------------
# generate_kropki_dots
# ---------------------------------------------------------------------------

class TestGenerateKropkiDots:

    def setup_method(self):
        self.dots = generate_kropki_dots(COMPLETE_BOARD)

    def test_returns_dict(self):
        assert isinstance(self.dots, dict)

    def test_values_are_white_or_black(self):
        for key, val in self.dots.items():
            assert val in ('white', 'black'), f"Unexpected dot type '{val}' for key {key}"

    def test_key_format_valid(self):
        for key in self.dots:
            parts = key.split(',')
            assert len(parts) == 3, f"Malformed key: {key}"
            r, c, d = parts
            assert r.isdigit() and c.isdigit()
            assert d in ('r', 'b'), f"Unknown direction '{d}' in key {key}"

    def test_white_dot_means_consecutive(self):
        for key, dot_type in self.dots.items():
            if dot_type != 'white':
                continue
            r, c, direction = key.split(',')
            r, c = int(r), int(c)
            a = COMPLETE_BOARD[r][c]
            b = COMPLETE_BOARD[r][c + 1] if direction == 'r' else COMPLETE_BOARD[r + 1][c]
            assert abs(a - b) == 1, f"{key}: white dot but |{a}-{b}|≠1"

    def test_black_dot_means_double(self):
        for key, dot_type in self.dots.items():
            if dot_type != 'black':
                continue
            r, c, direction = key.split(',')
            r, c = int(r), int(c)
            a = COMPLETE_BOARD[r][c]
            b = COMPLETE_BOARD[r][c + 1] if direction == 'r' else COMPLETE_BOARD[r + 1][c]
            assert a == 2 * b or b == 2 * a, (
                f"{key}: black dot but {a},{b} are not in a ×2 relationship"
            )

    def test_no_dot_for_unrelated_cells(self):
        """Cells with neither consecutive nor doubling relation must have no dot."""
        for r in range(9):
            for c in range(8):
                a, b = COMPLETE_BOARD[r][c], COMPLETE_BOARD[r][c + 1]
                key = f'{r},{c},r'
                if abs(a - b) != 1 and a != 2 * b and b != 2 * a:
                    assert key not in self.dots, (
                        f"{key}: dot present but {a},{b} have no valid relation"
                    )


# ---------------------------------------------------------------------------
# generate_greater_than_signs
# ---------------------------------------------------------------------------

class TestGenerateGreaterThanSigns:

    def setup_method(self):
        self.signs = generate_greater_than_signs(COMPLETE_BOARD)

    def test_returns_dict(self):
        assert isinstance(self.signs, dict)

    def test_count_is_144(self):
        # 9×8 horizontal + 8×9 vertical = 72 + 72
        assert len(self.signs) == 144

    def test_values_are_greater_or_less(self):
        for key, sign in self.signs.items():
            assert sign in ('>', '<'), f"Unexpected sign '{sign}' for key {key}"

    def test_signs_consistent_with_solution(self):
        for key, sign in self.signs.items():
            r, c, direction = key.split(',')
            r, c = int(r), int(c)
            a = COMPLETE_BOARD[r][c]
            b = COMPLETE_BOARD[r][c + 1] if direction == 'r' else COMPLETE_BOARD[r + 1][c]
            if sign == '>':
                assert a > b, f"{key}: sign='>' but {a} not > {b}"
            else:
                assert a < b, f"{key}: sign='<' but {a} not < {b}"

    def test_all_internal_edges_present(self):
        for r in range(9):
            for c in range(9):
                if c + 1 < 9:
                    assert f'{r},{c},r' in self.signs
                if r + 1 < 9:
                    assert f'{r},{c},b' in self.signs

    def test_sign_is_inverse_of_reverse_direction(self):
        """If (r,c,r) is '>' then the value at (r,c) > (r,c+1); basic sanity."""
        for key, sign in self.signs.items():
            r, c, direction = key.split(',')
            r, c = int(r), int(c)
            a = COMPLETE_BOARD[r][c]
            b = COMPLETE_BOARD[r][c + 1] if direction == 'r' else COMPLETE_BOARD[r + 1][c]
            assert (sign == '>') == (a > b)


# ---------------------------------------------------------------------------
# generate_thermos
# ---------------------------------------------------------------------------

class TestGenerateThermos:

    def setup_method(self):
        self.thermos = generate_thermos(COMPLETE_BOARD)

    def test_returns_list(self):
        assert isinstance(self.thermos, list)

    def test_at_most_6_thermos_by_default(self):
        assert len(self.thermos) <= 6

    def test_each_thermo_at_least_3_cells(self):
        for thermo in self.thermos:
            assert len(thermo) >= 3, f"Thermo too short: {thermo}"

    def test_values_strictly_increasing(self):
        for thermo in self.thermos:
            vals = [COMPLETE_BOARD[r][c] for r, c in thermo]
            for i in range(len(vals) - 1):
                assert vals[i] < vals[i + 1], (
                    f"Thermo values not strictly increasing: {vals}"
                )

    def test_cells_orthogonally_adjacent(self):
        for thermo in self.thermos:
            for i in range(len(thermo) - 1):
                r1, c1 = thermo[i]
                r2, c2 = thermo[i + 1]
                assert abs(r1 - r2) + abs(c1 - c2) == 1, (
                    f"Thermo cells not orthogonally adjacent: "
                    f"{thermo[i]} → {thermo[i + 1]}"
                )

    def test_no_cell_appears_in_two_thermos(self):
        all_cells: list = []
        for thermo in self.thermos:
            all_cells.extend(thermo)
        assert len(all_cells) == len(set(all_cells)), "A cell appears in multiple thermos"

    def test_custom_max_thermos(self):
        thermos = generate_thermos(COMPLETE_BOARD, max_thermos=2)
        assert len(thermos) <= 2

    def test_custom_min_len(self):
        thermos = generate_thermos(COMPLETE_BOARD, min_len=4)
        for thermo in thermos:
            assert len(thermo) >= 4

    def test_custom_max_len(self):
        thermos = generate_thermos(COMPLETE_BOARD, max_len=4)
        for thermo in thermos:
            assert len(thermo) <= 4


# ---------------------------------------------------------------------------
# generate_sandwich_clues
# ---------------------------------------------------------------------------

class TestGenerateSandwichClues:

    def setup_method(self):
        self.clues = generate_sandwich_clues(COMPLETE_BOARD)

    def test_returns_dict_with_rows_and_cols(self):
        assert 'rows' in self.clues
        assert 'cols' in self.clues

    def test_rows_list_has_9_entries(self):
        assert len(self.clues['rows']) == 9

    def test_cols_list_has_9_entries(self):
        assert len(self.clues['cols']) == 9

    def test_row_sums_correct(self):
        for r in range(9):
            line = COMPLETE_BOARD[r]
            p1, p9 = line.index(1), line.index(9)
            lo, hi = min(p1, p9), max(p1, p9)
            expected = sum(line[lo + 1:hi])
            assert self.clues['rows'][r] == expected, (
                f"Row {r}: expected sandwich sum {expected}, got {self.clues['rows'][r]}"
            )

    def test_col_sums_correct(self):
        for c in range(9):
            line = [COMPLETE_BOARD[r][c] for r in range(9)]
            p1, p9 = line.index(1), line.index(9)
            lo, hi = min(p1, p9), max(p1, p9)
            expected = sum(line[lo + 1:hi])
            assert self.clues['cols'][c] == expected, (
                f"Col {c}: expected sandwich sum {expected}, got {self.clues['cols'][c]}"
            )

    def test_all_sums_non_negative(self):
        for s in self.clues['rows'] + self.clues['cols']:
            assert s >= 0, f"Negative sandwich sum: {s}"


# ---------------------------------------------------------------------------
# generate_little_killer_clues
# ---------------------------------------------------------------------------

class TestGenerateLittleKillerClues:

    def setup_method(self):
        self.clues = generate_little_killer_clues(COMPLETE_BOARD)

    def test_returns_list(self):
        assert isinstance(self.clues, list)

    def test_default_at_most_10_clues(self):
        assert len(self.clues) <= 10

    def test_clue_sums_match_solution(self):
        for clue in self.clues:
            expected = sum(COMPLETE_BOARD[r][c] for r, c in clue['cells'])
            assert clue['sum'] == expected

    def test_each_clue_has_at_least_2_cells(self):
        for clue in self.clues:
            assert len(clue['cells']) >= 2

    def test_cells_form_consistent_diagonal(self):
        """All cells in a clue must follow the same (dr, dc) direction."""
        for clue in self.clues:
            cells = clue['cells']
            assert len(cells) >= 2
            dr = cells[1][0] - cells[0][0]
            dc = cells[1][1] - cells[0][1]
            assert dr == 1, f"Expected dr=1, got {dr}"
            assert dc in (1, -1), f"Expected dc=±1, got {dc}"
            for i in range(1, len(cells)):
                assert cells[i][0] - cells[i - 1][0] == dr
                assert cells[i][1] - cells[i - 1][1] == dc

    def test_custom_n_clues(self):
        clues = generate_little_killer_clues(COMPLETE_BOARD, n_clues=3)
        assert len(clues) <= 3


# ---------------------------------------------------------------------------
# _generate_variant_data  (routing)
# ---------------------------------------------------------------------------

class TestGenerateVariantData:

    @pytest.mark.parametrize('sudoku_type', [
        'CLASSIC', 'DIAGONAL', 'WINDOKU',
        'ANTI_KNIGHT', 'ANTI_KING', 'NON_CONSECUTIVE',
    ])
    def test_global_rule_types_return_empty_dict(self, sudoku_type):
        data = _generate_variant_data(COMPLETE_BOARD, sudoku_type)
        assert data == {}

    def test_killer_returns_killer_cages(self):
        data = _generate_variant_data(COMPLETE_BOARD, 'KILLER')
        assert 'killer_cages' in data
        assert isinstance(data['killer_cages'], list)

    def test_kropki_returns_kropki_dots(self):
        data = _generate_variant_data(COMPLETE_BOARD, 'KROPKI')
        assert 'kropki_dots' in data
        assert isinstance(data['kropki_dots'], dict)

    def test_greater_than_returns_signs(self):
        data = _generate_variant_data(COMPLETE_BOARD, 'GREATER_THAN')
        assert 'greater_than_signs' in data
        assert isinstance(data['greater_than_signs'], dict)

    def test_thermo_returns_thermos(self):
        data = _generate_variant_data(COMPLETE_BOARD, 'THERMO')
        assert 'thermos' in data
        assert isinstance(data['thermos'], list)

    def test_sandwich_returns_clues(self):
        data = _generate_variant_data(COMPLETE_BOARD, 'SANDWICH')
        assert 'sandwich_clues' in data

    def test_little_killer_returns_clues(self):
        data = _generate_variant_data(COMPLETE_BOARD, 'LITTLE_KILLER')
        assert 'little_killer_clues' in data


# ---------------------------------------------------------------------------
# _level_index
# ---------------------------------------------------------------------------

class TestLevelIndex:

    def test_easy_is_0(self):
        assert _level_index('EASY') == 0

    def test_medium_is_1(self):
        assert _level_index('MEDIUM') == 1

    def test_hard_is_2(self):
        assert _level_index('HARD') == 2

    def test_expert_is_3(self):
        assert _level_index('EXPERT') == 3

    def test_ordering_is_strictly_monotone(self):
        levels = ['EASY', 'MEDIUM', 'HARD', 'EXPERT']
        indices = [_level_index(lv) for lv in levels]
        assert indices == sorted(indices)
        assert len(set(indices)) == 4  # all distinct


# ---------------------------------------------------------------------------
# make_puzzle
# ---------------------------------------------------------------------------

class TestMakePuzzle:
    """
    make_puzzle() removes cells from a complete board targeting a difficulty.
    Tests use EASY (fastest path) to keep the suite quick.
    """

    def test_returns_tuple_or_none(self):
        result = make_puzzle(COMPLETE_BOARD, 'CLASSIC', 'EASY')
        assert result is None or isinstance(result, tuple)

    def test_easy_returns_result(self):
        result = make_puzzle(COMPLETE_BOARD, 'CLASSIC', 'EASY')
        assert result is not None, "make_puzzle returned None for EASY / CLASSIC"

    def test_puzzle_has_fewer_givens_than_81(self):
        result = make_puzzle(COMPLETE_BOARD, 'CLASSIC', 'EASY')
        if result is None:
            pytest.skip("make_puzzle returned None")
        puzzle, _ = result
        givens = sum(v != 0 for row in puzzle for v in row)
        assert givens < 81

    def test_puzzle_is_subset_of_solution(self):
        """Every non-zero cell in the puzzle must match the full board."""
        result = make_puzzle(COMPLETE_BOARD, 'CLASSIC', 'EASY')
        if result is None:
            pytest.skip("make_puzzle returned None")
        puzzle, _ = result
        for r in range(9):
            for c in range(9):
                if puzzle[r][c] != 0:
                    assert puzzle[r][c] == COMPLETE_BOARD[r][c], (
                        f"Cell ({r},{c}): puzzle={puzzle[r][c]} "
                        f"but solution={COMPLETE_BOARD[r][c]}"
                    )

    def test_puzzle_has_unique_solution(self):
        result = make_puzzle(COMPLETE_BOARD, 'CLASSIC', 'EASY')
        if result is None:
            pytest.skip("make_puzzle returned None")
        puzzle, _ = result
        n = count_solutions(puzzle, 'CLASSIC', limit=2)
        assert n == 1, f"Puzzle does not have a unique solution (count={n})"

    def test_returns_solve_result(self):
        result = make_puzzle(COMPLETE_BOARD, 'CLASSIC', 'EASY')
        if result is None:
            pytest.skip("make_puzzle returned None")
        _, solve_result = result
        assert isinstance(solve_result, SolveResult)

    def test_solve_result_difficulty_is_valid_level(self):
        result = make_puzzle(COMPLETE_BOARD, 'CLASSIC', 'EASY')
        if result is None:
            pytest.skip("make_puzzle returned None")
        _, solve_result = result
        assert solve_result.difficulty in ('EASY', 'MEDIUM', 'HARD', 'EXPERT')

    def test_does_not_mutate_full_board(self):
        original = copy.deepcopy(COMPLETE_BOARD)
        make_puzzle(COMPLETE_BOARD, 'CLASSIC', 'EASY')
        assert COMPLETE_BOARD == original, "make_puzzle mutated the input full_board"

    def test_puzzle_shape_is_9x9(self):
        result = make_puzzle(COMPLETE_BOARD, 'CLASSIC', 'EASY')
        if result is None:
            pytest.skip("make_puzzle returned None")
        puzzle, _ = result
        assert len(puzzle) == 9
        assert all(len(row) == 9 for row in puzzle)


# ---------------------------------------------------------------------------
# ODD_EVEN mask fixture  (derived from COMPLETE_BOARD → always consistent)
# ---------------------------------------------------------------------------

_ODD_EVEN_MASK = [
    ['odd' if COMPLETE_BOARD[r][c] % 2 == 1 else 'even' for c in range(9)]
    for r in range(9)
]


# ---------------------------------------------------------------------------
# Module-level constants
# ---------------------------------------------------------------------------

class TestConstants:

    def test_eval_start_covers_all_levels(self):
        assert set(EVAL_START) >= {'EASY', 'MEDIUM', 'HARD', 'EXPERT'}

    def test_eval_start_values_are_positive_ints(self):
        for key, val in EVAL_START.items():
            assert isinstance(val, int) and val > 0, (
                f"EVAL_START[{key!r}] = {val!r} is not a positive int"
            )

    def test_min_givens_is_positive_int(self):
        assert isinstance(MIN_GIVENS, int)
        assert MIN_GIVENS > 0

    def test_min_givens_below_every_eval_start(self):
        for key, val in EVAL_START.items():
            assert MIN_GIVENS < val, (
                f"MIN_GIVENS={MIN_GIVENS} >= EVAL_START[{key!r}]={val}"
            )

    def test_puzzle_specific_types_exact_contents(self):
        expected = {'KILLER', 'KROPKI', 'GREATER_THAN', 'THERMO', 'SANDWICH', 'LITTLE_KILLER'}
        assert _PUZZLE_SPECIFIC_TYPES == expected

    def test_puzzle_specific_types_is_set_like(self):
        assert hasattr(_PUZZLE_SPECIFIC_TYPES, '__contains__')


# ---------------------------------------------------------------------------
# count_solutions — variant kwargs
# ---------------------------------------------------------------------------

class TestCountSolutionsVariants:

    def test_complete_board_with_killer_cages(self):
        cages = generate_killer_cages(COMPLETE_BOARD)
        n = count_solutions(COMPLETE_BOARD, 'KILLER', limit=2, killer_cages=cages)
        assert n == 1

    def test_complete_board_with_sandwich_clues(self):
        clues = generate_sandwich_clues(COMPLETE_BOARD)
        n = count_solutions(COMPLETE_BOARD, 'SANDWICH', limit=2, sandwich_clues=clues)
        assert n == 1

    def test_complete_board_with_greater_than_signs(self):
        signs = generate_greater_than_signs(COMPLETE_BOARD)
        n = count_solutions(COMPLETE_BOARD, 'GREATER_THAN', limit=2,
                            greater_than_signs=signs)
        assert n == 1

    def test_complete_board_with_kropki_dots(self):
        dots = generate_kropki_dots(COMPLETE_BOARD)
        n = count_solutions(COMPLETE_BOARD, 'KROPKI', limit=2, kropki_dots=dots)
        assert n == 1

    def test_complete_board_with_thermos(self):
        thermos = generate_thermos(COMPLETE_BOARD)
        if not thermos:
            pytest.skip("no thermos generated from COMPLETE_BOARD")
        n = count_solutions(COMPLETE_BOARD, 'THERMO', limit=2, thermos=thermos)
        assert n == 1

    def test_complete_board_with_little_killer_clues(self):
        clues = generate_little_killer_clues(COMPLETE_BOARD)
        n = count_solutions(COMPLETE_BOARD, 'LITTLE_KILLER', limit=2,
                            little_killer_clues=clues)
        assert n == 1

    def test_single_empty_cell_with_killer_cages_still_unique(self):
        board = copy.deepcopy(COMPLETE_BOARD)
        board[8][8] = 0
        cages = generate_killer_cages(COMPLETE_BOARD)
        n = count_solutions(board, 'KILLER', limit=2, killer_cages=cages)
        assert n == 1

    def test_diagonal_constraint_blocks_repeated_diagonal_digit(self):
        """COMPLETE_BOARD has digit 5 at (0,0) and (4,4) — both on the main diagonal.
        Removing (4,4) leaves no valid candidate there (5 blocked by diagonal) → 0 solutions.
        This confirms count_solutions correctly applies the diagonal constraint."""
        board = copy.deepcopy(COMPLETE_BOARD)
        board[4][4] = 0
        n = count_solutions(board, 'DIAGONAL', limit=2)
        assert n == 0


# ---------------------------------------------------------------------------
# generate_complete_board — ODD_EVEN variant
# ---------------------------------------------------------------------------

class TestGenerateCompleteBoardOddEven:

    def test_returns_non_none(self):
        board = generate_complete_board('ODD_EVEN', odd_even_mask=_ODD_EVEN_MASK)
        assert board is not None

    def test_returns_valid_classic_board(self):
        board = generate_complete_board('ODD_EVEN', odd_even_mask=_ODD_EVEN_MASK)
        if board is None:
            pytest.skip("ODD_EVEN board generation returned None")
        assert _is_valid_complete_board(board)

    def test_respects_odd_mask_cells(self):
        board = generate_complete_board('ODD_EVEN', odd_even_mask=_ODD_EVEN_MASK)
        if board is None:
            pytest.skip("ODD_EVEN board generation returned None")
        for r in range(9):
            for c in range(9):
                if _ODD_EVEN_MASK[r][c] == 'odd':
                    assert board[r][c] % 2 == 1, (
                        f"Cell ({r},{c}) should be odd; got {board[r][c]}"
                    )

    def test_respects_even_mask_cells(self):
        board = generate_complete_board('ODD_EVEN', odd_even_mask=_ODD_EVEN_MASK)
        if board is None:
            pytest.skip("ODD_EVEN board generation returned None")
        for r in range(9):
            for c in range(9):
                if _ODD_EVEN_MASK[r][c] == 'even':
                    assert board[r][c] % 2 == 0, (
                        f"Cell ({r},{c}) should be even; got {board[r][c]}"
                    )

    def test_without_mask_falls_back_to_classic(self):
        """With odd_even_mask=None the ODD_EVEN type imposes no extra constraint."""
        board = generate_complete_board('ODD_EVEN', odd_even_mask=None)
        if board is None:
            pytest.skip("ODD_EVEN board generation returned None")
        assert _is_valid_complete_board(board)


# ---------------------------------------------------------------------------
# make_puzzle — n_orders parameter and MEDIUM difficulty
# ---------------------------------------------------------------------------

class TestMakePuzzleNOrders:

    def test_n_orders_2_returns_result_or_none(self):
        result = make_puzzle(COMPLETE_BOARD, 'CLASSIC', 'EASY', n_orders=2)
        assert result is None or isinstance(result, tuple)

    def test_n_orders_shapes_are_valid(self):
        for n in (1, 3):
            result = make_puzzle(COMPLETE_BOARD, 'CLASSIC', 'EASY', n_orders=n)
            if result is not None:
                puzzle, sr = result
                assert len(puzzle) == 9
                assert isinstance(sr, SolveResult)

    def test_medium_returns_tuple_or_none(self):
        result = make_puzzle(COMPLETE_BOARD, 'CLASSIC', 'MEDIUM')
        assert result is None or isinstance(result, tuple)

    def test_medium_puzzle_is_subset_of_solution(self):
        result = make_puzzle(COMPLETE_BOARD, 'CLASSIC', 'MEDIUM')
        if result is None:
            pytest.skip("make_puzzle returned None for CLASSIC/MEDIUM")
        puzzle, _ = result
        for r in range(9):
            for c in range(9):
                if puzzle[r][c] != 0:
                    assert puzzle[r][c] == COMPLETE_BOARD[r][c]


# ---------------------------------------------------------------------------
# make_puzzle — variant types
# ---------------------------------------------------------------------------

class TestMakePuzzleVariantTypes:

    def test_thermo_easy_returns_tuple_or_none(self):
        thermos = generate_thermos(COMPLETE_BOARD)
        if not thermos:
            pytest.skip("no thermos generated")
        result = make_puzzle(COMPLETE_BOARD, 'THERMO', 'EASY', thermos=thermos)
        assert result is None or isinstance(result, tuple)

    def test_thermo_puzzle_is_subset_of_solution(self):
        thermos = generate_thermos(COMPLETE_BOARD)
        if not thermos:
            pytest.skip("no thermos generated")
        result = make_puzzle(COMPLETE_BOARD, 'THERMO', 'EASY', thermos=thermos)
        if result is None:
            pytest.skip("make_puzzle returned None for THERMO/EASY")
        puzzle, _ = result
        for r in range(9):
            for c in range(9):
                if puzzle[r][c] != 0:
                    assert puzzle[r][c] == COMPLETE_BOARD[r][c]

    def test_thermo_puzzle_has_unique_solution(self):
        thermos = generate_thermos(COMPLETE_BOARD)
        if not thermos:
            pytest.skip("no thermos generated")
        result = make_puzzle(COMPLETE_BOARD, 'THERMO', 'EASY', thermos=thermos)
        if result is None:
            pytest.skip("make_puzzle returned None for THERMO/EASY")
        puzzle, _ = result
        n = count_solutions(puzzle, 'THERMO', limit=2, thermos=thermos)
        assert n == 1

    def test_sandwich_easy_returns_tuple_or_none(self):
        clues = generate_sandwich_clues(COMPLETE_BOARD)
        result = make_puzzle(COMPLETE_BOARD, 'SANDWICH', 'EASY', sandwich_clues=clues)
        assert result is None or isinstance(result, tuple)

    def test_greater_than_easy_returns_tuple_or_none(self):
        signs = generate_greater_than_signs(COMPLETE_BOARD)
        result = make_puzzle(COMPLETE_BOARD, 'GREATER_THAN', 'EASY',
                             greater_than_signs=signs)
        assert result is None or isinstance(result, tuple)

    def test_kropki_easy_returns_tuple_or_none(self):
        dots = generate_kropki_dots(COMPLETE_BOARD)
        result = make_puzzle(COMPLETE_BOARD, 'KROPKI', 'EASY', kropki_dots=dots)
        assert result is None or isinstance(result, tuple)

    def test_little_killer_easy_returns_tuple_or_none(self):
        clues = generate_little_killer_clues(COMPLETE_BOARD)
        result = make_puzzle(COMPLETE_BOARD, 'LITTLE_KILLER', 'EASY',
                             little_killer_clues=clues)
        assert result is None or isinstance(result, tuple)


# ---------------------------------------------------------------------------
# generate_puzzles
# ---------------------------------------------------------------------------

class TestGeneratePuzzles:

    def test_returns_list(self):
        results = generate_puzzles('CLASSIC', 'EASY', count=1)
        assert isinstance(results, list)

    def test_count_1_produces_1_record(self):
        results = generate_puzzles('CLASSIC', 'EASY', count=1)
        assert len(results) == 1

    def test_max_attempts_zero_returns_empty(self):
        results = generate_puzzles('CLASSIC', 'EASY', count=1, max_attempts=0)
        assert results == []

    def test_record_has_required_keys(self):
        results = generate_puzzles('CLASSIC', 'EASY', count=1)
        if not results:
            pytest.skip("generate_puzzles returned no results")
        record = results[0]
        for key in ('puzzle', 'solution', 'difficulty', 'solver_difficulty',
                    'score', 'givens', 'techniques', 'sudoku_type'):
            assert key in record, f"Missing key: {key!r}"

    def test_puzzle_is_9x9(self):
        results = generate_puzzles('CLASSIC', 'EASY', count=1)
        if not results:
            pytest.skip("generate_puzzles returned no results")
        puzzle = results[0]['puzzle']
        assert len(puzzle) == 9
        assert all(len(row) == 9 for row in puzzle)

    def test_solution_is_valid_complete_board(self):
        results = generate_puzzles('CLASSIC', 'EASY', count=1)
        if not results:
            pytest.skip("generate_puzzles returned no results")
        assert _is_valid_complete_board(results[0]['solution'])

    def test_puzzle_is_subset_of_solution(self):
        results = generate_puzzles('CLASSIC', 'EASY', count=1)
        if not results:
            pytest.skip("generate_puzzles returned no results")
        puzzle = results[0]['puzzle']
        solution = results[0]['solution']
        for r in range(9):
            for c in range(9):
                if puzzle[r][c] != 0:
                    assert puzzle[r][c] == solution[r][c], (
                        f"Cell ({r},{c}): puzzle={puzzle[r][c]} "
                        f"but solution={solution[r][c]}"
                    )

    def test_difficulty_is_valid_level(self):
        results = generate_puzzles('CLASSIC', 'EASY', count=1)
        if not results:
            pytest.skip("generate_puzzles returned no results")
        assert results[0]['difficulty'] in ('EASY', 'MEDIUM', 'HARD', 'EXPERT')

    def test_sudoku_type_field_matches_request(self):
        results = generate_puzzles('CLASSIC', 'EASY', count=1)
        if not results:
            pytest.skip("generate_puzzles returned no results")
        assert results[0]['sudoku_type'] == 'CLASSIC'

    def test_techniques_is_dict(self):
        results = generate_puzzles('CLASSIC', 'EASY', count=1)
        if not results:
            pytest.skip("generate_puzzles returned no results")
        assert isinstance(results[0]['techniques'], dict)

    def test_givens_is_non_negative_int(self):
        results = generate_puzzles('CLASSIC', 'EASY', count=1)
        if not results:
            pytest.skip("generate_puzzles returned no results")
        givens = results[0]['givens']
        assert isinstance(givens, int) and givens >= 0

    def test_score_is_non_negative(self):
        results = generate_puzzles('CLASSIC', 'EASY', count=1)
        if not results:
            pytest.skip("generate_puzzles returned no results")
        assert results[0]['score'] >= 0

    def test_killer_record_has_killer_cages(self):
        results = generate_puzzles('KILLER', 'EASY', count=1)
        if not results:
            pytest.skip("generate_puzzles returned no results")
        assert 'killer_cages' in results[0]

    def test_killer_puzzle_is_empty_board(self):
        """KILLER always produces an empty grid — all constraint comes from cages."""
        results = generate_puzzles('KILLER', 'EASY', count=1)
        if not results:
            pytest.skip("generate_puzzles returned no results")
        puzzle = results[0]['puzzle']
        assert all(puzzle[r][c] == 0 for r in range(9) for c in range(9)), (
            "KILLER puzzle should be all zeros"
        )
