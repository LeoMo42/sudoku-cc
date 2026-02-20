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
