#!/usr/bin/env python3
"""
X-Sudoku Generator
Generates valid X-Sudoku (Diagonal Sudoku) puzzles and saves them to JSON
"""

import json
import random
from typing import List, Set, Optional
from datetime import datetime


class XSudokuGenerator:
    """Generator for X-Sudoku (Diagonal Sudoku) puzzles"""

    SIZE = 9
    BOX_SIZE = 3
    EMPTY = 0

    def __init__(self):
        self.board = [[self.EMPTY] * self.SIZE for _ in range(self.SIZE)]
        self.attempts = 0

    def is_valid(self, board: List[List[int]], row: int, col: int, num: int) -> bool:
        """Check if placing num at (row, col) is valid"""

        # Check row
        if num in board[row]:
            return False

        # Check column
        if num in [board[r][col] for r in range(self.SIZE)]:
            return False

        # Check 3x3 box
        box_row, box_col = 3 * (row // 3), 3 * (col // 3)
        for r in range(box_row, box_row + 3):
            for c in range(box_col, box_col + 3):
                if board[r][c] == num:
                    return False

        # Check main diagonal (top-left to bottom-right)
        if row == col:
            if num in [board[i][i] for i in range(self.SIZE) if board[i][i] != self.EMPTY]:
                return False

        # Check anti-diagonal (top-right to bottom-left)
        if row + col == self.SIZE - 1:
            if num in [board[i][self.SIZE - 1 - i] for i in range(self.SIZE)
                      if board[i][self.SIZE - 1 - i] != self.EMPTY]:
                return False

        return True

    def solve(self, board: List[List[int]]) -> bool:
        """Solve X-Sudoku using backtracking"""

        # Find empty cell
        for row in range(self.SIZE):
            for col in range(self.SIZE):
                if board[row][col] == self.EMPTY:
                    # Try numbers 1-9 in random order for variety
                    numbers = list(range(1, 10))
                    random.shuffle(numbers)

                    for num in numbers:
                        if self.is_valid(board, row, col, num):
                            board[row][col] = num

                            if self.solve(board):
                                return True

                            # Backtrack
                            board[row][col] = self.EMPTY

                    return False

        return True  # All cells filled

    def verify_solution(self, board: List[List[int]]) -> bool:
        """Verify that the board is a valid X-Sudoku solution"""

        # Check all rows
        for row in board:
            if sorted(row) != list(range(1, 10)):
                return False

        # Check all columns
        for col in range(self.SIZE):
            if sorted([board[row][col] for row in range(self.SIZE)]) != list(range(1, 10)):
                return False

        # Check all 3x3 boxes
        for box_row in range(0, self.SIZE, 3):
            for box_col in range(0, self.SIZE, 3):
                box = []
                for r in range(box_row, box_row + 3):
                    for c in range(box_col, box_col + 3):
                        box.append(board[r][c])
                if sorted(box) != list(range(1, 10)):
                    return False

        # Check main diagonal
        main_diag = [board[i][i] for i in range(self.SIZE)]
        if sorted(main_diag) != list(range(1, 10)):
            print(f"Main diagonal invalid: {main_diag}")
            return False

        # Check anti-diagonal
        anti_diag = [board[i][self.SIZE - 1 - i] for i in range(self.SIZE)]
        if sorted(anti_diag) != list(range(1, 10)):
            print(f"Anti-diagonal invalid: {anti_diag}")
            return False

        return True

    def generate(self) -> Optional[List[List[int]]]:
        """Generate a single valid X-Sudoku solution"""

        # Start with empty board
        board = [[self.EMPTY] * self.SIZE for _ in range(self.SIZE)]

        # Solve it
        if self.solve(board):
            # Verify the solution
            if self.verify_solution(board):
                return board
            else:
                print("Generated board failed verification!")
                return None

        return None

    def generate_multiple(self, count: int) -> List[List[List[int]]]:
        """Generate multiple unique X-Sudoku solutions"""

        solutions = []
        seen_signatures = set()

        print(f"Generating {count} unique X-Sudoku solutions...")

        attempts = 0
        max_attempts = count * 10  # Give up after too many attempts

        while len(solutions) < count and attempts < max_attempts:
            attempts += 1

            print(f"Attempt {attempts}: Generating... ", end='', flush=True)

            board = self.generate()

            if board:
                # Create signature to check uniqueness (first row + main diagonal)
                signature = tuple(board[0] + [board[i][i] for i in range(self.SIZE)])

                if signature not in seen_signatures:
                    solutions.append(board)
                    seen_signatures.add(signature)
                    print(f"✓ ({len(solutions)}/{count})")
                else:
                    print("✗ (duplicate)")
            else:
                print("✗ (failed)")

        return solutions


def save_to_json(solutions: List[List[List[int]]], filename: str):
    """Save solutions to JSON file"""

    data = {
        "generated_at": datetime.now().isoformat(),
        "count": len(solutions),
        "description": "Pre-generated valid X-Sudoku solutions",
        "solutions": solutions
    }

    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"\n✅ Saved {len(solutions)} solutions to {filename}")


def main():
    """Main entry point"""

    import argparse

    parser = argparse.ArgumentParser(description='Generate X-Sudoku puzzles')
    parser.add_argument('-n', '--count', type=int, default=50,
                       help='Number of puzzles to generate (default: 50)')
    parser.add_argument('-o', '--output', type=str, default='x_sudoku_solutions.json',
                       help='Output JSON file (default: x_sudoku_solutions.json)')

    args = parser.parse_args()

    # Generate solutions
    generator = XSudokuGenerator()
    solutions = generator.generate_multiple(args.count)

    if solutions:
        # Save to JSON
        save_to_json(solutions, args.output)

        # Show example
        print("\n📋 Example solution:")
        for row in solutions[0]:
            print(' '.join(str(x) for x in row))

        # Verify diagonals
        main_diag = [solutions[0][i][i] for i in range(9)]
        anti_diag = [solutions[0][i][8-i] for i in range(9)]
        print(f"\nMain diagonal: {main_diag}")
        print(f"Anti-diagonal: {anti_diag}")
    else:
        print("❌ Failed to generate any solutions")


if __name__ == '__main__':
    main()
