"""Tests for CandidateGrid (candidates.py)."""
import pytest
from candidates import CandidateGrid, ALL_CANDIDATES, DIGIT_BIT


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def empty():
    return [[0] * 9 for _ in range(9)]


def candidates_set(cg, r, c):
    return set(cg.candidates(r, c))


# ---------------------------------------------------------------------------
# Initialisation
# ---------------------------------------------------------------------------

class TestInit:
    def test_empty_board_all_candidates(self):
        cg = CandidateGrid(empty())
        for r in range(9):
            for c in range(9):
                assert cg.candidate_count(r, c) == 9

    def test_filled_cell_has_no_candidates(self):
        board = empty()
        board[0][0] = 5
        cg = CandidateGrid(board)
        assert cg.candidates(0, 0) == []
        assert cg.candidate_count(0, 0) == 0

    def test_row_elimination_on_init(self):
        board = empty()
        board[3] = [1, 2, 3, 4, 5, 6, 7, 8, 0]   # only 9 missing
        cg = CandidateGrid(board)
        assert cg.candidates(3, 8) == [9]

    def test_col_elimination_on_init(self):
        board = empty()
        for r in range(8):
            board[r][0] = r + 1          # col 0 has 1-8
        cg = CandidateGrid(board)
        assert cg.candidates(8, 0) == [9]

    def test_box_elimination_on_init(self):
        board = empty()
        vals = iter(range(1, 10))
        for r in range(3):
            for c in range(3):
                board[r][c] = next(vals)
        board[0][0] = 0  # remove one cell from the filled box
        cg = CandidateGrid(board)
        # (0,0) had value 1; now empty. Box already has 2-9, so only 1 is possible.
        assert cg.candidates(0, 0) == [1]

    def test_is_solved_full_board(self):
        # Build a valid complete board (first 9 rows of a known solution)
        sol = [
            [5, 3, 4, 6, 7, 8, 9, 1, 2],
            [6, 7, 2, 1, 9, 5, 3, 4, 8],
            [1, 9, 8, 3, 4, 2, 5, 6, 7],
            [8, 5, 9, 7, 6, 1, 4, 2, 3],
            [4, 2, 6, 8, 5, 3, 7, 9, 1],
            [7, 1, 3, 9, 2, 4, 8, 5, 6],
            [9, 6, 1, 5, 3, 7, 2, 8, 4],
            [2, 8, 7, 4, 1, 9, 6, 3, 5],
            [3, 4, 5, 2, 8, 6, 1, 7, 9],
        ]
        cg = CandidateGrid(sol)
        assert cg.is_solved()

    def test_has_contradiction_detects_empty_candidates(self):
        board = empty()
        # Place all 9 digits in row 0 except leave cell (0,0) empty,
        # but also place all 9 digits in col 0 → (0,0) has no candidates
        board[0] = [0, 2, 3, 4, 5, 6, 7, 8, 9]
        for r in range(1, 9):
            board[r][0] = r + 1   # col 0 gets 2-9, row 0 col 0 stays 0
        # Now row 0 eliminates 2-9 from (0,0), col 0 eliminates... wait, row 0 already
        # has 2-9 so only 1 is possible in (0,0). Let's force contradiction differently.
        board2 = empty()
        # Row: 1-8 present → only 9 possible
        board2[0] = [0, 1, 2, 3, 4, 5, 6, 7, 8]
        # Col 0: 9 already present in another row
        board2[1][0] = 9
        cg2 = CandidateGrid(board2)
        assert cg2.has_contradiction()


# ---------------------------------------------------------------------------
# place()
# ---------------------------------------------------------------------------

class TestPlace:
    def test_place_updates_board(self):
        cg = CandidateGrid(empty())
        cg.place(4, 4, 5)
        assert cg.board[4][4] == 5

    def test_place_clears_candidates(self):
        cg = CandidateGrid(empty())
        cg.place(4, 4, 5)
        assert cg.candidates(4, 4) == []

    def test_place_eliminates_from_row(self):
        cg = CandidateGrid(empty())
        cg.place(0, 0, 7)
        for c in range(1, 9):
            assert 7 not in cg.candidates(0, c)

    def test_place_eliminates_from_col(self):
        cg = CandidateGrid(empty())
        cg.place(0, 0, 7)
        for r in range(1, 9):
            assert 7 not in cg.candidates(r, 0)

    def test_place_eliminates_from_box(self):
        cg = CandidateGrid(empty())
        cg.place(0, 0, 7)
        for r in range(3):
            for c in range(3):
                if r == 0 and c == 0:
                    continue
                assert 7 not in cg.candidates(r, c)

    def test_place_does_not_affect_outside_box(self):
        cg = CandidateGrid(empty())
        cg.place(0, 0, 7)
        # Cell (3, 3) is outside row 0, col 0, and box (0,0)
        assert 7 in cg.candidates(3, 3)


# ---------------------------------------------------------------------------
# eliminate()
# ---------------------------------------------------------------------------

class TestEliminate:
    def test_eliminate_removes_candidate(self):
        cg = CandidateGrid(empty())
        assert cg.eliminate(0, 0, 5) is True
        assert 5 not in cg.candidates(0, 0)

    def test_eliminate_returns_false_if_not_present(self):
        board = empty()
        board[0][1] = 5          # eliminates 5 from (0,0) via row
        cg = CandidateGrid(board)
        assert cg.eliminate(0, 0, 5) is False

    def test_eliminate_does_not_propagate(self):
        """eliminate() is local — peers are not affected."""
        cg = CandidateGrid(empty())
        cg.eliminate(0, 0, 3)
        assert 3 in cg.candidates(0, 1)   # peer unaffected


# ---------------------------------------------------------------------------
# Houses
# ---------------------------------------------------------------------------

class TestHouses:
    def test_classic_has_27_houses(self):
        cg = CandidateGrid(empty(), 'CLASSIC')
        assert len(cg.get_houses()) == 27

    def test_diagonal_has_29_houses(self):
        cg = CandidateGrid(empty(), 'DIAGONAL')
        assert len(cg.get_houses()) == 29

    def test_windoku_has_31_houses(self):
        cg = CandidateGrid(empty(), 'WINDOKU')
        assert len(cg.get_houses()) == 31

    def test_every_house_has_9_cells(self):
        for stype in ('CLASSIC', 'DIAGONAL', 'WINDOKU'):
            cg = CandidateGrid(empty(), stype)
            for house in cg.get_houses():
                assert len(house) == 9, f'{stype}: house has {len(house)} cells'

    def test_get_peers_consistent_with_houses(self):
        cg = CandidateGrid(empty(), 'CLASSIC')
        # Each peer of (0,0) must share at least one house with (0,0)
        peers = cg.get_peers(0, 0)
        for pr, pc in peers:
            shared = any(
                (0, 0) in h and (pr, pc) in h
                for h in cg.get_houses()
            )
            assert shared, f'peer ({pr},{pc}) shares no house with (0,0)'

    def test_classic_cell_has_20_peers(self):
        cg = CandidateGrid(empty(), 'CLASSIC')
        # (0,0): 8 row peers + 8 col peers + 4 remaining box peers = 20
        assert len(cg.get_peers(0, 0)) == 20

    def test_peers_cached(self):
        cg = CandidateGrid(empty(), 'CLASSIC')
        p1 = cg.get_peers(3, 3)
        p2 = cg.get_peers(3, 3)
        assert p1 is p2     # same object (cache hit)

    def test_houses_cached(self):
        cg = CandidateGrid(empty(), 'CLASSIC')
        h1 = cg.get_houses()
        h2 = cg.get_houses()
        assert h1 is h2


# ---------------------------------------------------------------------------
# Variant: DIAGONAL
# ---------------------------------------------------------------------------

class TestDiagonal:
    def test_main_diagonal_elimination(self):
        cg = CandidateGrid(empty(), 'DIAGONAL')
        cg.place(0, 0, 3)
        # All other cells on main diagonal should not have 3
        for i in range(1, 9):
            assert 3 not in cg.candidates(i, i)

    def test_anti_diagonal_elimination(self):
        cg = CandidateGrid(empty(), 'DIAGONAL')
        cg.place(0, 8, 7)
        for i in range(1, 9):
            assert 7 not in cg.candidates(i, 8 - i)

    def test_non_diagonal_cell_unaffected(self):
        cg = CandidateGrid(empty(), 'DIAGONAL')
        cg.place(0, 0, 3)
        # (3, 4): not in row 0, not in col 0, not in box (0,0),
        # not on main diagonal (3≠4), not on anti-diagonal (3+4=7≠8)
        assert 3 in cg.candidates(3, 4)


# ---------------------------------------------------------------------------
# Variant: WINDOKU
# ---------------------------------------------------------------------------

class TestWindoku:
    def test_window_elimination(self):
        """Placing in a Windoku window eliminates from the whole window."""
        cg = CandidateGrid(empty(), 'WINDOKU')
        cg.place(1, 1, 4)   # top-left corner of window (1,1)–(3,3)
        for r in range(1, 4):
            for c in range(1, 4):
                if r == 1 and c == 1:
                    continue
                assert 4 not in cg.candidates(r, c)

    def test_outside_window_not_affected(self):
        cg = CandidateGrid(empty(), 'WINDOKU')
        cg.place(1, 1, 4)
        # (4, 4) is outside all windows and not in same row/col/box
        assert 4 in cg.candidates(4, 4)


# ---------------------------------------------------------------------------
# Variant: ANTI_KNIGHT
# ---------------------------------------------------------------------------

class TestAntiKnight:
    def test_knight_moves_eliminated(self):
        cg = CandidateGrid(empty(), 'ANTI_KNIGHT')
        cg.place(4, 4, 6)
        knight_targets = [
            (2, 3), (2, 5), (3, 2), (3, 6),
            (5, 2), (5, 6), (6, 3), (6, 5),
        ]
        for r, c in knight_targets:
            assert 6 not in cg.candidates(r, c), f'knight target ({r},{c}) still has 6'

    def test_non_knight_cell_unaffected(self):
        cg = CandidateGrid(empty(), 'ANTI_KNIGHT')
        cg.place(4, 4, 6)
        # (4, 5) is a regular row peer (not a knight target only)
        # But (3, 3) is NOT a knight's move from (4,4) — diagonal, only 1 step
        assert 6 not in cg.candidates(3, 3)  # same box, eliminated by box rule
        # (0, 0) is far away — no constraint
        assert 6 in cg.candidates(0, 0)

    def test_anti_knight_init_from_board(self):
        board = empty()
        board[0][0] = 5
        cg = CandidateGrid(board, 'ANTI_KNIGHT')
        assert 5 not in cg.candidates(1, 2)
        assert 5 not in cg.candidates(2, 1)


# ---------------------------------------------------------------------------
# Variant: ANTI_KING
# ---------------------------------------------------------------------------

class TestAntiKing:
    def test_diagonal_neighbours_eliminated(self):
        cg = CandidateGrid(empty(), 'ANTI_KING')
        cg.place(4, 4, 8)
        diagonals = [(3, 3), (3, 5), (5, 3), (5, 5)]
        for r, c in diagonals:
            assert 8 not in cg.candidates(r, c)

    def test_orthogonal_neighbours_eliminated_via_row_col(self):
        """Orthogonal neighbours are covered by standard row/col elimination."""
        cg = CandidateGrid(empty(), 'ANTI_KING')
        cg.place(4, 4, 8)
        assert 8 not in cg.candidates(4, 5)  # row
        assert 8 not in cg.candidates(5, 4)  # col


# ---------------------------------------------------------------------------
# Variant: NON_CONSECUTIVE
# ---------------------------------------------------------------------------

class TestNonConsecutive:
    def test_adjacent_minus1_eliminated(self):
        board = empty()
        board[0][0] = 5
        cg = CandidateGrid(board, 'NON_CONSECUTIVE')
        # Orthogonal neighbours cannot have 4 or 6
        assert 4 not in cg.candidates(0, 1)
        assert 4 not in cg.candidates(1, 0)
        assert 6 not in cg.candidates(0, 1)
        assert 6 not in cg.candidates(1, 0)

    def test_diagonal_neighbour_not_affected_by_nonconsec(self):
        board = empty()
        board[0][0] = 5
        cg = CandidateGrid(board, 'NON_CONSECUTIVE')
        # (1,1) is diagonal — non-consecutive rule doesn't apply
        assert 4 in cg.candidates(1, 1)
        assert 6 in cg.candidates(1, 1)

    def test_boundary_digit1_no_lower(self):
        board = empty()
        board[4][4] = 1
        cg = CandidateGrid(board, 'NON_CONSECUTIVE')
        # digit-1 = 0 → nothing to eliminate below; digit+1 = 2 must be gone
        assert 2 not in cg.candidates(4, 5)
        assert 2 not in cg.candidates(5, 4)

    def test_boundary_digit9_no_higher(self):
        board = empty()
        board[4][4] = 9
        cg = CandidateGrid(board, 'NON_CONSECUTIVE')
        assert 8 not in cg.candidates(4, 5)
        assert 8 not in cg.candidates(5, 4)

    def test_place_propagates_nonconsec(self):
        cg = CandidateGrid(empty(), 'NON_CONSECUTIVE')
        cg.place(4, 4, 5)
        assert 4 not in cg.candidates(4, 5)
        assert 6 not in cg.candidates(4, 5)
        assert 4 not in cg.candidates(3, 4)
        assert 6 not in cg.candidates(3, 4)


# ---------------------------------------------------------------------------
# Variant: ODD_EVEN
# ---------------------------------------------------------------------------

class TestOddEven:
    def _mask(self, pattern: list[list[str | None]]) -> list[list[str | None]]:
        return pattern

    def test_odd_cell_has_only_odd_candidates(self):
        mask = [[None] * 9 for _ in range(9)]
        mask[0][0] = 'odd'
        cg = CandidateGrid(empty(), 'ODD_EVEN', odd_even_mask=mask)
        assert candidates_set(cg, 0, 0) == {1, 3, 5, 7, 9}

    def test_even_cell_has_only_even_candidates(self):
        mask = [[None] * 9 for _ in range(9)]
        mask[0][0] = 'even'
        cg = CandidateGrid(empty(), 'ODD_EVEN', odd_even_mask=mask)
        assert candidates_set(cg, 0, 0) == {2, 4, 6, 8}

    def test_none_cell_has_all_candidates(self):
        mask = [[None] * 9 for _ in range(9)]
        cg = CandidateGrid(empty(), 'ODD_EVEN', odd_even_mask=mask)
        assert cg.candidate_count(0, 0) == 9


# ---------------------------------------------------------------------------
# Variant: THERMO
# ---------------------------------------------------------------------------

# Simple 3-cell thermo at row 0: (0,0) < (0,1) < (0,2)
_THERMO_3 = [[(0, 0), (0, 1), (0, 2)]]


class TestThermo:
    def test_position_bounds_init(self):
        """Position i in thermo length n: min=i+1, max=9-(n-1-i)."""
        cg = CandidateGrid(empty(), 'THERMO', thermos=_THERMO_3)
        # bulb (pos 0): min=1, max=7  → {1..7}
        assert candidates_set(cg, 0, 0) == set(range(1, 8))
        # middle (pos 1): min=2, max=8 → {2..8}
        assert candidates_set(cg, 0, 1) == set(range(2, 9))
        # tip (pos 2): min=3, max=9 → {3..9}
        assert candidates_set(cg, 0, 2) == set(range(3, 10))

    def test_placement_restricts_before(self):
        """Placing 5 at middle position eliminates 5-9 from bulb."""
        cg = CandidateGrid(empty(), 'THERMO', thermos=_THERMO_3)
        cg.place(0, 1, 5)
        assert all(d < 5 for d in cg.candidates(0, 0))

    def test_placement_restricts_after(self):
        """Placing 5 at middle position eliminates 1-5 from tip."""
        cg = CandidateGrid(empty(), 'THERMO', thermos=_THERMO_3)
        cg.place(0, 1, 5)
        assert all(d > 5 for d in cg.candidates(0, 2))

    def test_contradiction_impossible_thermo(self):
        """A 9-cell thermo is impossible — must detect contradiction."""
        thermo9 = [[(r, 0) for r in range(9)]]
        cg = CandidateGrid(empty(), 'THERMO', thermos=thermo9)
        # Every cell needs a unique value 1-9 in order, so only one solution.
        # But the 5th cell (pos=4) needs min=5 and max=5 → only {5}
        assert cg.candidates(4, 0) == [5]

    def test_houses_unchanged_by_thermo(self):
        """THERMO does not add extra houses."""
        cg = CandidateGrid(empty(), 'THERMO', thermos=_THERMO_3)
        assert len(cg.get_houses()) == 27

    def test_non_thermo_cell_unaffected(self):
        """A cell outside the thermo and outside all standard peers is unaffected."""
        cg = CandidateGrid(empty(), 'THERMO', thermos=_THERMO_3)
        cg.place(0, 1, 5)
        # (5, 5) shares no house with (0,1): different row, different col, different box
        # → 5 must still be a candidate there
        assert 5 in candidates_set(cg, 5, 5)


# ---------------------------------------------------------------------------
# Variant: GREATER_THAN
# ---------------------------------------------------------------------------

def _gt_signs_from_solution(sol):
    """Derive all 144 greater-than signs from a complete solution."""
    signs = {}
    for r in range(9):
        for c in range(9):
            if c + 1 < 9:
                signs[f'{r},{c},r'] = '>' if sol[r][c] > sol[r][c + 1] else '<'
            if r + 1 < 9:
                signs[f'{r},{c},b'] = '>' if sol[r][c] > sol[r + 1][c] else '<'
    return signs


# A known valid classic solution
_GT_SOLUTION = [
    [5, 3, 7, 4, 1, 6, 8, 9, 2],
    [9, 8, 6, 5, 2, 7, 4, 3, 1],
    [1, 2, 4, 3, 8, 9, 7, 5, 6],
    [3, 6, 9, 8, 7, 2, 5, 1, 4],
    [4, 7, 5, 9, 3, 1, 2, 6, 8],
    [8, 1, 2, 6, 5, 4, 3, 7, 9],
    [2, 4, 3, 1, 6, 5, 9, 8, 7],
    [6, 9, 8, 7, 4, 3, 1, 2, 5],
    [7, 5, 1, 2, 9, 8, 6, 4, 3],
]


class TestGreaterThan:
    def test_right_edge_greater(self):
        """Placing the larger cell restricts the smaller neighbour."""
        signs = _gt_signs_from_solution(_GT_SOLUTION)
        # sol[0][0]=5, sol[0][1]=3 → sign "0,0,r" = '>'
        assert signs['0,0,r'] == '>'
        cg = CandidateGrid(empty(), 'GREATER_THAN', greater_than_signs=signs)
        cg.place(0, 0, 5)
        # right neighbour (0,1) must be < 5 → eliminate 5,6,7,8,9
        for d in range(5, 10):
            assert d not in candidates_set(cg, 0, 1)

    def test_right_edge_less(self):
        """Placing the smaller cell restricts the larger neighbour."""
        signs = _gt_signs_from_solution(_GT_SOLUTION)
        # sol[0][1]=3, sol[0][2]=7 → sign "0,1,r" = '<'
        assert signs['0,1,r'] == '<'
        cg = CandidateGrid(empty(), 'GREATER_THAN', greater_than_signs=signs)
        cg.place(0, 1, 3)
        # right neighbour (0,2) must be > 3 → eliminate 1,2,3
        for d in range(1, 4):
            assert d not in candidates_set(cg, 0, 2)

    def test_left_edge_propagation(self):
        """Placing into the right cell of an edge propagates to the left cell."""
        signs = _gt_signs_from_solution(_GT_SOLUTION)
        # sign "0,0,r"='>': left > right.  Place right=3 → left must be > 3
        cg = CandidateGrid(empty(), 'GREATER_THAN', greater_than_signs=signs)
        cg.place(0, 1, 3)   # right cell of edge "0,0,r"
        # left neighbour (0,0) must be > 3 (since sign[0,0,r]='>')
        for d in range(1, 4):
            assert d not in candidates_set(cg, 0, 0)

    def test_bottom_edge_propagation(self):
        signs = _gt_signs_from_solution(_GT_SOLUTION)
        # sol[0][0]=5 > sol[1][0]=9? No: 5 < 9 → sign "0,0,b" = '<'
        assert signs['0,0,b'] == '<'
        cg = CandidateGrid(empty(), 'GREATER_THAN', greater_than_signs=signs)
        cg.place(0, 0, 5)
        # bottom (1,0) must be > 5 → eliminate 1-5
        for d in range(1, 6):
            assert d not in candidates_set(cg, 1, 0)

    def test_houses_unchanged(self):
        signs = _gt_signs_from_solution(_GT_SOLUTION)
        cg = CandidateGrid(empty(), 'GREATER_THAN', greater_than_signs=signs)
        assert len(cg.get_houses()) == 27


# ---------------------------------------------------------------------------
# Variant: KILLER
# ---------------------------------------------------------------------------

# From playsudoku.ru puzzle skl9_1_005
_KILLER_SOLUTION = [
    [2, 7, 3, 5, 8, 9, 1, 4, 6],
    [9, 5, 4, 2, 1, 6, 3, 7, 8],
    [1, 8, 6, 3, 7, 4, 5, 2, 9],
    [7, 2, 5, 9, 6, 1, 4, 8, 3],
    [3, 9, 1, 8, 4, 2, 7, 6, 5],
    [6, 4, 8, 7, 3, 5, 2, 9, 1],
    [4, 1, 7, 6, 5, 8, 9, 3, 2],
    [5, 6, 2, 4, 9, 3, 8, 1, 7],
    [8, 3, 9, 1, 2, 7, 6, 5, 4],
]

# Cage 'a': (0,0),(0,1) sum=9
# Cage 'b': (0,2),(1,1),(1,2) sum=12
# Cage 'c': (1,0),(2,0) sum=10
_KILLER_CAGES = [
    {'id': 0, 'cells': [(0, 0), (0, 1)], 'sum': 9},          # a
    {'id': 1, 'cells': [(0, 2), (1, 1), (1, 2)], 'sum': 12}, # b
    {'id': 2, 'cells': [(1, 0), (2, 0)], 'sum': 10},          # c
]


class TestKiller:
    def test_init_restricts_by_cage_sum(self):
        """Cage {(0,0),(0,1)} sum=9: valid combos are (1,8),(2,7),(3,6),(4,5)."""
        cg = CandidateGrid(empty(), 'KILLER', killer_cages=_KILLER_CAGES)
        # Valid digits for a 2-cell cage summing to 9: {1,2,3,4,5,6,7,8} (no 9 — 9+? would exceed)
        valid = {1, 2, 3, 4, 5, 6, 7, 8}
        assert candidates_set(cg, 0, 0) == valid
        assert candidates_set(cg, 0, 1) == valid

    def test_no_repeat_within_cage(self):
        """Placing a digit eliminates it from all other cage cells."""
        cg = CandidateGrid(empty(), 'KILLER', killer_cages=_KILLER_CAGES)
        cg.place(0, 0, 2)
        assert 2 not in candidates_set(cg, 0, 1)

    def test_last_cell_deduction(self):
        """When all cage cells but one are filled, last cell is determined."""
        board = empty()
        board[0][0] = 2   # cage 'a' sum=9, one cell filled with 2
        cg = CandidateGrid(board, 'KILLER', killer_cages=_KILLER_CAGES)
        # Remaining cell (0,1) must be 9-2=7
        assert cg.candidates(0, 1) == [7]

    def test_cages_added_as_houses(self):
        """KILLER adds cage houses on top of the standard 27."""
        cg = CandidateGrid(empty(), 'KILLER', killer_cages=_KILLER_CAGES)
        assert len(cg.get_houses()) == 27 + len(_KILLER_CAGES)

    def test_killer_house_size_varies(self):
        """Cage houses can be smaller than 9."""
        cg = CandidateGrid(empty(), 'KILLER', killer_cages=_KILLER_CAGES)
        cage_houses = cg.get_houses()[27:]
        sizes = {len(h) for h in cage_houses}
        assert sizes <= {2, 3, 4, 5}  # cages are 2-5 cells


# ---------------------------------------------------------------------------
# Variant: KROPKI
# ---------------------------------------------------------------------------

class TestKropki:
    def _dots(self, *pairs):
        """Build a kropki_dots dict from (key, dot_type) pairs."""
        return dict(pairs)

    def test_white_dot_restricts_to_consecutive(self):
        """Placing 5 with a white dot right → neighbour must be 4 or 6."""
        dots = {'0,0,r': 'white'}
        cg = CandidateGrid(empty(), 'KROPKI', kropki_dots=dots)
        cg.place(0, 0, 5)
        assert candidates_set(cg, 0, 1) == {4, 6}

    def test_white_dot_boundary_digit1(self):
        """Placing 1 with white dot → neighbour must be 2 only."""
        dots = {'0,0,r': 'white'}
        cg = CandidateGrid(empty(), 'KROPKI', kropki_dots=dots)
        cg.place(0, 0, 1)
        assert 2 in candidates_set(cg, 0, 1)
        assert 3 not in candidates_set(cg, 0, 1)

    def test_black_dot_restricts_to_double(self):
        """Placing 3 with a black dot right → neighbour must be 6 only."""
        dots = {'0,0,r': 'black'}
        cg = CandidateGrid(empty(), 'KROPKI', kropki_dots=dots)
        cg.place(0, 0, 3)
        # 3*2=6 (valid), 3/2=1.5 (not integer) → only 6
        assert candidates_set(cg, 0, 1) == {6}

    def test_black_dot_places4(self):
        """Placing 4 with a black dot → neighbour must be 2 or 8."""
        dots = {'0,0,r': 'black'}
        cg = CandidateGrid(empty(), 'KROPKI', kropki_dots=dots)
        cg.place(0, 0, 4)
        assert 2 in candidates_set(cg, 0, 1)
        assert 8 in candidates_set(cg, 0, 1)
        assert 3 not in candidates_set(cg, 0, 1)

    def test_no_dot_eliminates_consecutive_and_double(self):
        """No-dot edge: neighbour must NOT be consecutive or double."""
        dots = {}  # no dot between (0,0) and (0,1)
        cg = CandidateGrid(empty(), 'KROPKI', kropki_dots=dots)
        cg.place(0, 0, 4)
        # eliminate: 3 (4-1), 5 (4+1), 8 (4*2), 2 (4/2)
        for d in (2, 3, 5, 8):
            assert d not in candidates_set(cg, 0, 1)
        # keep: 1, 4, 6, 7, 9 (minus row/col/box elim of 4 itself)
        assert 7 in candidates_set(cg, 0, 1)

    def test_bottom_dot_propagates(self):
        """Dots work on bottom edges too."""
        dots = {'0,0,b': 'white'}
        cg = CandidateGrid(empty(), 'KROPKI', kropki_dots=dots)
        cg.place(0, 0, 5)
        assert candidates_set(cg, 1, 0) == {4, 6}


# ---------------------------------------------------------------------------
# Variant: SANDWICH
# ---------------------------------------------------------------------------

class TestSandwich:
    def _make_clues(self, row_sums, col_sums):
        return {'rows': row_sums, 'cols': col_sums}

    def test_no_propagation_without_both_sentinels(self):
        """If only 1 is placed (no 9 yet), no sandwich propagation occurs."""
        clues = self._make_clues([10] * 9, [10] * 9)
        cg = CandidateGrid(empty(), 'SANDWICH', sandwich_clues=clues)
        cg.place(0, 0, 1)
        # (0, 4) should still have many candidates (no sandwich deduction yet)
        assert cg.candidate_count(0, 4) > 1

    def test_last_between_cell_deduced(self):
        """With 1 at col 0, 9 at col 8, and 6 of 7 between cells filled,
        the last between cell must equal clue - sum_of_others."""
        # Row 0: 1, 2, 3, 4, 5, 6, 7, 8→use ?, 9
        # sandwich sum = 2+3+4+5+6+7 = 27. Between is cols 1-7.
        # Fill cols 1-6 (values 2-7), leave col 7 (value 8) empty.
        board = empty()
        board[0][0] = 1
        board[0][8] = 9
        board[0][1] = 2
        board[0][2] = 3
        board[0][3] = 4
        board[0][4] = 5
        board[0][5] = 6
        board[0][6] = 7
        # col 7 is empty. sum between = 2+3+4+5+6+7 + ? = 27 → ? = 0… that's wrong.
        # Let's use a simpler case: 1 at 0, 9 at 8, between sum = 8.
        # Fill cols 1-6 with arbitrary values summing to 0 from between perspective.
        # Easier: 1 at col 0, 9 at col 2, between = only col 1. Clue = solution[0][1].
        board2 = empty()
        board2[0][0] = 1
        board2[0][2] = 9
        # between is col 1 only, clue = 5
        clues2 = self._make_clues([5] + [0] * 8, [0] * 9)
        cg2 = CandidateGrid(board2, 'SANDWICH', sandwich_clues=clues2)
        # After init: board has 1 at (0,0) and 9 at (0,2), both placed.
        # _apply_placement(0,0,1) and _apply_placement(0,2,9) both trigger _apply_sandwich
        # and _sandwich_line. With only col 1 between and empty: remaining = 5-0 = 5.
        assert cg2.candidates(0, 1) == [5]

    def test_col_clue_propagates(self):
        """Column sandwich clues work the same way."""
        board = empty()
        board[0][0] = 1
        board[2][0] = 9
        clues = self._make_clues([0] * 9, [3] + [0] * 8)
        cg = CandidateGrid(board, 'SANDWICH', sandwich_clues=clues)
        # Between row 0 and row 2 in col 0 is only row 1. Must equal 3.
        assert cg.candidates(1, 0) == [3]


# ---------------------------------------------------------------------------
# Variant: LITTLE_KILLER
# ---------------------------------------------------------------------------

class TestLittleKiller:
    def test_last_cell_deduction(self):
        """When only one cell of a diagonal is empty, its value is determined."""
        # Diagonal: (0,0),(1,1),(2,2) with sum=15. Board has (0,0)=4, (1,1)=5.
        board = empty()
        board[0][0] = 4
        board[1][1] = 5
        clues = [{'cells': [(0, 0), (1, 1), (2, 2)], 'sum': 15}]
        cg = CandidateGrid(board, 'LITTLE_KILLER', little_killer_clues=clues)
        # (2,2) must be 15-4-5=6
        assert cg.candidates(2, 2) == [6]

    def test_no_deduction_multiple_empty(self):
        """With multiple empty cells, no deduction is possible."""
        board = empty()
        board[0][0] = 4
        clues = [{'cells': [(0, 0), (1, 1), (2, 2)], 'sum': 15}]
        cg = CandidateGrid(board, 'LITTLE_KILLER', little_killer_clues=clues)
        # Two empty cells — no forced deduction
        assert cg.candidate_count(1, 1) > 1

    def test_little_killer_not_a_house(self):
        """LITTLE_KILLER does not add diagonal lines as houses."""
        clues = [{'cells': [(0, 0), (1, 1), (2, 2)], 'sum': 15}]
        cg = CandidateGrid(empty(), 'LITTLE_KILLER', little_killer_clues=clues)
        assert len(cg.get_houses()) == 27
