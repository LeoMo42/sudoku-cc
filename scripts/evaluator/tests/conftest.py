"""Shared fixtures and helpers for evaluator tests."""
import sys
from pathlib import Path

# Make the evaluator package importable regardless of where pytest is invoked
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'evaluator'))


def empty_board() -> list[list[int]]:
    return [[0] * 9 for _ in range(9)]


def board_from_rows(*rows: list[int]) -> list[list[int]]:
    """Build a 9×9 board from up to 9 rows; missing rows are filled with zeros."""
    result = [list(r) for r in rows]
    while len(result) < 9:
        result.append([0] * 9)
    return result
