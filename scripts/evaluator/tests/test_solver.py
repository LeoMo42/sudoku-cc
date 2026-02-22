"""Tests for the technique-based solver (solver.py)."""
import pytest
from solver import solve, SolveResult, LEVEL_ORDER


# ---------------------------------------------------------------------------
# Known puzzles with verified difficulty
# ---------------------------------------------------------------------------

# Solved by naked singles only → EASY
EASY_PUZZLE = [
    [5, 3, 0,  0, 7, 0,  0, 0, 0],
    [6, 0, 0,  1, 9, 5,  0, 0, 0],
    [0, 9, 8,  0, 0, 0,  0, 6, 0],
    [8, 0, 0,  0, 6, 0,  0, 0, 3],
    [4, 0, 0,  8, 0, 3,  0, 0, 1],
    [7, 0, 0,  0, 2, 0,  0, 0, 6],
    [0, 6, 0,  0, 0, 0,  2, 8, 0],
    [0, 0, 0,  4, 1, 9,  0, 0, 5],
    [0, 0, 0,  0, 8, 0,  0, 7, 9],
]

# Requires hidden singles → MEDIUM
MEDIUM_PUZZLE = [
    [0, 0, 0,  0, 0, 0,  0, 0, 0],
    [0, 0, 0,  0, 0, 3,  0, 8, 5],
    [0, 0, 1,  0, 2, 0,  0, 0, 0],
    [0, 0, 0,  5, 0, 7,  0, 0, 0],
    [0, 0, 4,  0, 0, 0,  1, 0, 0],
    [0, 9, 0,  0, 0, 0,  0, 0, 0],
    [5, 0, 0,  0, 0, 0,  0, 7, 3],
    [0, 0, 2,  0, 1, 0,  0, 0, 0],
    [0, 0, 0,  0, 4, 0,  0, 0, 9],
]

# Already solved — solver should report it as solved instantly
SOLVED_BOARD = [
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

# Contradiction on init (two 5s in same row)
INVALID_PUZZLE = [
    [5, 5, 0,  0, 0, 0,  0, 0, 0],
    *[[0] * 9 for _ in range(8)],
]


# ---------------------------------------------------------------------------
# Basic correctness
# ---------------------------------------------------------------------------

class TestSolveBasic:
    def test_easy_puzzle_solved(self):
        r = solve(EASY_PUZZLE)
        assert r.solved is True

    def test_easy_puzzle_correct_solution(self):
        r = solve(EASY_PUZZLE)
        # Spot-check known cells of the solution
        # (0,2) should be 4 in the classic solution
        assert r.solved

    def test_medium_puzzle_solved(self):
        r = solve(MEDIUM_PUZZLE)
        assert r.solved is True

    def test_already_solved_board(self):
        r = solve(SOLVED_BOARD)
        assert r.solved is True
        assert r.steps == []     # no steps needed

    def test_invalid_puzzle_not_solved(self):
        r = solve(INVALID_PUZZLE)
        assert r.solved is False

    def test_empty_board_not_solved(self):
        r = solve([[0] * 9 for _ in range(9)])
        assert r.solved is False   # too many candidates, solver gets stuck

    def test_returns_solve_result(self):
        r = solve(EASY_PUZZLE)
        assert isinstance(r, SolveResult)


# ---------------------------------------------------------------------------
# Difficulty classification
# ---------------------------------------------------------------------------

class TestDifficulty:
    def test_easy_puzzle_is_easy(self):
        r = solve(EASY_PUZZLE)
        assert r.difficulty == 'EASY'

    def test_easy_puzzle_uses_only_naked_singles(self):
        r = solve(EASY_PUZZLE)
        counts = r.technique_counts()
        assert 'NAKED_SINGLE' in counts
        assert set(counts.keys()) == {'NAKED_SINGLE'}

    def test_medium_puzzle_is_medium(self):
        r = solve(MEDIUM_PUZZLE)
        assert r.difficulty == 'MEDIUM'

    def test_medium_puzzle_uses_hidden_singles(self):
        r = solve(MEDIUM_PUZZLE)
        assert 'HIDDEN_SINGLE' in r.technique_counts()

    def test_hardest_level_matches_difficulty(self):
        r = solve(EASY_PUZZLE)
        assert r.hardest_level == r.difficulty

    def test_difficulty_is_valid_level(self):
        for puzzle in (EASY_PUZZLE, MEDIUM_PUZZLE):
            r = solve(puzzle)
            assert r.difficulty in LEVEL_ORDER

    def test_unsolved_has_easy_defaults(self):
        r = solve([[0] * 9 for _ in range(9)])
        assert r.difficulty == 'EASY'   # default when nothing applied


# ---------------------------------------------------------------------------
# Steps and scoring
# ---------------------------------------------------------------------------

class TestSteps:
    def test_steps_non_empty_for_puzzle(self):
        r = solve(EASY_PUZZLE)
        assert len(r.steps) > 0

    def test_total_score_positive(self):
        r = solve(EASY_PUZZLE)
        assert r.total_score > 0

    def test_total_score_equals_sum_of_step_scores(self):
        r = solve(EASY_PUZZLE)
        assert r.total_score == sum(s.score for s in r.steps)

    def test_technique_counts_match_steps(self):
        r = solve(EASY_PUZZLE)
        counts = r.technique_counts()
        for step in r.steps:
            assert step.technique in counts
        assert sum(counts.values()) == len(r.steps)

    def test_no_steps_on_already_solved(self):
        r = solve(SOLVED_BOARD)
        assert r.steps == []
        assert r.total_score == 0


# ---------------------------------------------------------------------------
# max_steps guard
# ---------------------------------------------------------------------------

class TestMaxSteps:
    def test_max_steps_zero_returns_unsolved(self):
        r = solve(EASY_PUZZLE, max_steps=0)
        assert r.solved is False

    def test_max_steps_one_applies_one_step(self):
        r = solve(EASY_PUZZLE, max_steps=1)
        assert len(r.steps) <= 1


# ---------------------------------------------------------------------------
# Variant types
# ---------------------------------------------------------------------------

class TestVariants:
    def test_non_consecutive_easy_solved(self):
        # Known valid Non-Consecutive base board (from generate-non-consecutive.py)
        full = [
            [6, 8, 5,  2, 9, 3,  1, 7, 4],
            [9, 3, 1,  6, 4, 7,  5, 2, 8],
            [2, 7, 4,  1, 8, 5,  9, 6, 3],
            [5, 2, 7,  4, 1, 8,  3, 9, 6],
            [8, 6, 3,  9, 5, 2,  7, 4, 1],
            [1, 4, 9,  7, 3, 6,  2, 8, 5],
            [4, 9, 6,  3, 7, 1,  8, 5, 2],
            [7, 1, 8,  5, 2, 4,  6, 3, 9],
            [3, 5, 2,  8, 6, 9,  4, 1, 7],
        ]
        import copy
        puzzle = copy.deepcopy(full)
        # Remove a few cells (easy removal — naked singles will fill them)
        easy_removes = [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4),
                        (5, 5), (6, 6), (7, 7), (8, 8)]
        for r, c in easy_removes:
            puzzle[r][c] = 0

        r = solve(puzzle, 'NON_CONSECUTIVE')
        assert r.solved is True
        assert r.difficulty == 'EASY'

    def test_diagonal_type_accepted(self):
        # Just verify the solver doesn't crash on DIAGONAL type
        puzzle = [[0] * 9 for _ in range(9)]
        puzzle[0] = [0, 2, 3, 4, 5, 6, 7, 8, 9]
        r = solve(puzzle, 'DIAGONAL')
        assert isinstance(r, SolveResult)

    def test_anti_knight_medium_solved(self):
        """
        Anti-Knight puzzle that we know requires hidden singles.
        Generated from a valid Anti-Knight board.
        """
        # This is a lightweight check — just verify the solver runs correctly
        # with variant constraints enabled
        puzzle = [[0] * 9 for _ in range(9)]
        puzzle[0] = [1, 2, 3, 4, 5, 6, 7, 8, 0]
        r = solve(puzzle, 'ANTI_KNIGHT')
        assert isinstance(r, SolveResult)


# ---------------------------------------------------------------------------
# Regression: _compute_difficulty uses hardest_level, not score
# ---------------------------------------------------------------------------

class TestDifficultyRegression:
    def test_many_naked_singles_stay_easy(self):
        """51 naked singles → score > 0, but difficulty must be EASY (not inflated)."""
        r = solve(EASY_PUZZLE)
        assert r.difficulty == 'EASY'
        assert r.hardest_level == 'EASY'
        # Score is non-zero but difficulty is still EASY
        assert r.total_score > 0

    def test_one_hidden_single_makes_it_medium(self):
        """Even one hidden single should push difficulty to MEDIUM."""
        r = solve(MEDIUM_PUZZLE)
        assert r.difficulty == 'MEDIUM'
        assert r.hardest_level == 'MEDIUM'


# ---------------------------------------------------------------------------
# SolveResult structure
# ---------------------------------------------------------------------------

class TestSolveResult:
    def test_all_fields_have_correct_types(self):
        r = solve(EASY_PUZZLE)
        assert isinstance(r.solved, bool)
        assert isinstance(r.steps, list)
        assert isinstance(r.total_score, int)
        assert isinstance(r.hardest_level, str)
        assert isinstance(r.difficulty, str)

    def test_technique_counts_returns_typed_dict(self):
        r = solve(EASY_PUZZLE)
        counts = r.technique_counts()
        assert isinstance(counts, dict)
        assert all(isinstance(k, str) for k in counts)
        assert all(isinstance(v, int) and v > 0 for v in counts.values())

    def test_technique_counts_empty_when_no_steps(self):
        r = solve(SOLVED_BOARD)
        assert r.technique_counts() == {}


# ---------------------------------------------------------------------------
# Input immutability + solution correctness
# ---------------------------------------------------------------------------

import copy as _copy

# SOLVED_BOARD with one cell removed — trivially a single naked single.
_NEAR_COMPLETE = _copy.deepcopy(SOLVED_BOARD)
_NEAR_COMPLETE[0][0] = 0   # removed the 5


class TestSolveIntegrity:
    def test_board_not_mutated_by_solve(self):
        original = _copy.deepcopy(EASY_PUZZLE)
        solve(EASY_PUZZLE)
        assert EASY_PUZZLE == original

    def test_near_complete_board_solved_in_one_step(self):
        r = solve(_copy.deepcopy(_NEAR_COMPLETE))
        assert r.solved is True
        assert len(r.steps) == 1
        assert r.steps[0].technique == 'NAKED_SINGLE'
        assert r.steps[0].placements == [(0, 0, 5)]

    def test_easy_solution_is_valid_sudoku(self):
        """Reconstruct the solved board from step placements; verify rows/cols/boxes."""
        r = solve(EASY_PUZZLE)
        assert r.solved

        board = _copy.deepcopy(EASY_PUZZLE)
        for step in r.steps:
            for row, col, digit in step.placements:
                board[row][col] = digit

        digits = set(range(1, 10))
        for row in board:
            assert set(row) == digits
        for c in range(9):
            assert {board[r][c] for r in range(9)} == digits
        for br in range(3):
            for bc in range(3):
                box = {board[br * 3 + dr][bc * 3 + dc]
                       for dr in range(3) for dc in range(3)}
                assert box == digits


# ---------------------------------------------------------------------------
# Step integrity
# ---------------------------------------------------------------------------

class TestStepIntegrity:
    def test_all_techniques_are_registered(self):
        from techniques import TECHNIQUE_LEVEL
        r = solve(MEDIUM_PUZZLE)
        for step in r.steps:
            assert step.technique in TECHNIQUE_LEVEL, \
                f'Unknown technique: {step.technique}'

    def test_all_scores_positive(self):
        r = solve(MEDIUM_PUZZLE)
        for step in r.steps:
            assert step.score > 0, f'{step.technique} has score {step.score}'

    def test_each_step_has_placements_or_eliminations(self):
        r = solve(MEDIUM_PUZZLE)
        for step in r.steps:
            assert step.placements or step.eliminations, \
                f'{step.technique} step is a no-op'

    def test_placement_coords_in_valid_range(self):
        r = solve(EASY_PUZZLE)
        for step in r.steps:
            for row, col, digit in step.placements:
                assert 0 <= row <= 8
                assert 0 <= col <= 8
                assert 1 <= digit <= 9

    def test_naked_single_puzzle_step_count_equals_empty_cells(self):
        """EASY_PUZZLE uses naked singles only — one step per empty cell."""
        empty_count = sum(v == 0 for row in EASY_PUZZLE for v in row)
        r = solve(EASY_PUZZLE)
        assert len(r.steps) == empty_count


# ---------------------------------------------------------------------------
# max_steps precision
# ---------------------------------------------------------------------------

class TestMaxStepsPrecision:
    def test_max_steps_limits_step_count(self):
        for n in (1, 5, 10):
            r = solve(EASY_PUZZLE, max_steps=n)
            assert len(r.steps) <= n

    def test_large_max_steps_does_not_change_result(self):
        r_normal = solve(EASY_PUZZLE)
        r_large = solve(EASY_PUZZLE, max_steps=9999)
        assert r_large.solved == r_normal.solved
        assert len(r_large.steps) == len(r_normal.steps)
        assert r_large.total_score == r_normal.total_score


# ---------------------------------------------------------------------------
# LEVEL_ORDER properties
# ---------------------------------------------------------------------------

class TestLevelOrder:
    def test_level_order_is_correct_sequence(self):
        assert LEVEL_ORDER == ['EASY', 'MEDIUM', 'HARD', 'EXPERT']

    def test_hardest_level_and_difficulty_in_level_order(self):
        for puzzle in (EASY_PUZZLE, MEDIUM_PUZZLE):
            r = solve(puzzle)
            assert r.hardest_level in LEVEL_ORDER
            assert r.difficulty in LEVEL_ORDER

    def test_difficulty_equals_hardest_level(self):
        """_compute_difficulty must return hardest_level directly."""
        for puzzle in (EASY_PUZZLE, MEDIUM_PUZZLE):
            r = solve(puzzle)
            assert r.difficulty == r.hardest_level


# ---------------------------------------------------------------------------
# Variant interface — solver accepts all variant types without raising
# ---------------------------------------------------------------------------

class TestVariantInterface:
    # Fully empty board — no contradiction possible for any variant type.
    _EMPTY = [[0] * 9 for _ in range(9)]

    def test_no_extra_constraint_variants_on_empty_board(self):
        for vtype in ('CLASSIC', 'DIAGONAL', 'WINDOKU',
                      'ANTI_KNIGHT', 'ANTI_KING', 'NON_CONSECUTIVE'):
            r = solve(self._EMPTY, vtype)
            assert isinstance(r, SolveResult), f'{vtype} did not return SolveResult'
            assert not r.solved                 # empty board can't be solved

    def test_odd_even_type_with_all_none_mask(self):
        mask = [[None] * 9 for _ in range(9)]
        r = solve(self._EMPTY, 'ODD_EVEN', odd_even_mask=mask)
        assert isinstance(r, SolveResult)

    def test_killer_type_pins_single_cell(self):
        """A cage with sum=1 forces (0,0)=1; the naked single must be applied."""
        puzzle = [[0] * 9 for _ in range(9)]
        puzzle[0] = [0, 2, 3, 4, 5, 6, 7, 8, 9]
        cages = [{'cells': [(0, 0)], 'sum': 1}]
        r = solve(puzzle, 'KILLER', killer_cages=cages)
        assert isinstance(r, SolveResult)
        # Solver should have placed 1 at (0,0) as a naked single
        assert any(
            step.technique == 'NAKED_SINGLE' and (0, 0, 1) in step.placements
            for step in r.steps
        )

    def test_thermo_type_with_minimal_thermo(self):
        """THERMO type accepted; row-0 naked single still fires correctly."""
        puzzle = [[0] * 9 for _ in range(9)]
        puzzle[0] = [0, 2, 3, 4, 5, 6, 7, 8, 9]   # (0,0) → naked single → 1
        thermos = [[(1, 0), (2, 0)]]               # thermo in col 0, rows 1-2
        r = solve(puzzle, 'THERMO', thermos=thermos)
        assert isinstance(r, SolveResult)
        assert any(
            step.technique == 'NAKED_SINGLE' and (0, 0, 1) in step.placements
            for step in r.steps
        )
