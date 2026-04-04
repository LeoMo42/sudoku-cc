#!/usr/bin/env python3
"""
Generate valid Non-Consecutive Sudoku boards
Adjacent cells (horizontally/vertically) cannot differ by 1
"""

import random
from typing import List, Tuple, Optional

GRID_SIZE = 9
BOX_SIZE = 3


def is_valid_move(board: List[List[int]], row: int, col: int, num: int) -> bool:
    """Check if placing num at (row, col) is valid for Non-Consecutive Sudoku"""

    # Check row
    if num in board[row]:
        return False

    # Check column
    if num in [board[r][col] for r in range(GRID_SIZE)]:
        return False

    # Check 3x3 box
    box_row, box_col = (row // BOX_SIZE) * BOX_SIZE, (col // BOX_SIZE) * BOX_SIZE
    for r in range(box_row, box_row + BOX_SIZE):
        for c in range(box_col, box_col + BOX_SIZE):
            if board[r][c] == num:
                return False

    # Check Non-Consecutive constraint (adjacent cells cannot differ by 1)
    adjacents = [(row-1, col), (row+1, col), (row, col-1), (row, col+1)]
    for adj_row, adj_col in adjacents:
        if 0 <= adj_row < GRID_SIZE and 0 <= adj_col < GRID_SIZE:
            adj_val = board[adj_row][adj_col]
            if adj_val != 0 and abs(adj_val - num) == 1:
                return False

    return True


def solve_non_consecutive(board: List[List[int]]) -> bool:
    """Solve Non-Consecutive Sudoku using backtracking"""

    # Find empty cell
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            if board[row][col] == 0:
                # Try numbers 1-9 in random order
                numbers = list(range(1, 10))
                random.shuffle(numbers)

                for num in numbers:
                    if is_valid_move(board, row, col, num):
                        board[row][col] = num

                        if solve_non_consecutive(board):
                            return True

                        board[row][col] = 0

                return False

    return True


def generate_non_consecutive_sudoku() -> Optional[List[List[int]]]:
    """Generate a valid Non-Consecutive Sudoku board"""

    # Start with completely empty board - no pre-filling
    board = [[0] * GRID_SIZE for _ in range(GRID_SIZE)]

    # Use pure backtracking
    if solve_non_consecutive(board):
        return board

    return None


def verify_non_consecutive(board: List[List[int]]) -> bool:
    """Verify that board satisfies Non-Consecutive constraint"""

    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            num = board[row][col]

            # Check adjacent cells
            adjacents = [(row-1, col), (row+1, col), (row, col-1), (row, col+1)]
            for adj_row, adj_col in adjacents:
                if 0 <= adj_row < GRID_SIZE and 0 <= adj_col < GRID_SIZE:
                    if abs(board[adj_row][adj_col] - num) == 1:
                        return False

    return True


def print_board(board: List[List[int]]):
    """Print board in JavaScript array format"""
    print("const BASE_NON_CONSECUTIVE_SUDOKU = [")
    for row in board:
        print(f"  {row},")
    print("];")


def main():
    print("🎲 Generating Non-Consecutive Sudoku boards...\n")

    max_attempts = 10
    generated = 0

    for attempt in range(max_attempts):
        print(f"Attempt {attempt + 1}...", end=" ")

        board = generate_non_consecutive_sudoku()

        if board and verify_non_consecutive(board):
            print("✅ VALID!")
            generated += 1

            print(f"\n--- Board #{generated} ---")
            print_board(board)
            print()

            if generated >= 3:  # Generate 3 templates
                break
        else:
            print("❌ Failed")

    print(f"\n✅ Generated {generated} valid Non-Consecutive Sudoku boards!")


if __name__ == "__main__":
    main()
