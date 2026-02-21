# Puzzle Examples

Real puzzle examples used as reference data and test fixtures.
All puzzles are sourced from **[playsudoku.ru](https://www.playsudoku.ru)**.

---

## Files

### `killer_skl9_1_005.json`
**Source:** https://www.playsudoku.ru/killer/skl9_1_005.html
**Type:** KILLER
**Size:** 9×9, 33 cages

Killer Sudoku starts with a completely empty board. All constraints come from
cage sums — no given digits. No digit may repeat within a cage.

Format:
```json
{
  "puzzle": [[0, ...], ...],          // all zeros (empty board)
  "solution": [[2, 7, 3, ...], ...],  // 9×9 complete solution
  "killer_cages": [
    { "label": "a", "cells": [[0,0],[0,1]], "sum": 9 },
    ...
  ]
}
```

The `label` field matches the area labels from the original site source.
All 33 cage sums have been verified against the problem grid.

---

### `kropki_215.json`
**Source:** https://www.playsudoku.ru/kropki/kropki_215.html
**Type:** KROPKI
**Size:** 9×9 — 33 white dots, 9 black dots, 102 no-dot edges (144 total)

White dot between two cells: digits differ by exactly 1.
Black dot: one digit is exactly double the other.
No dot (missing key): **neither** relation holds — this is a negative constraint.

The dots were computed from the solution using the standard Kropki rules.
The partial puzzle board (given digits) is not stored — dots alone constrain the
solution uniquely on this puzzle.

Format:
```json
{
  "solution": [[6, 7, 8, ...], ...],
  "kropki_dots": {
    "0,0,r": "white",   // right edge of (0,0): |6-7|=1
    ...
  }
}
```

Key format: `"row,col,r"` = right edge of (row, col);  `"row,col,b"` = bottom edge.

---

### `greater_than_sgt_215.json`
**Source:** https://www.playsudoku.ru/sudoku_gt/sgt_215.html
**Type:** GREATER_THAN
**Size:** 9×9 — 73 `>` signs, 71 `<` signs (144 total)

Every internal edge carries a `<` or `>` sign. The sign compares the left/top
cell to the right/bottom cell. All 144 edges are present.

No given digits — the signs alone constrain the solution uniquely.

Format:
```json
{
  "solution": [[5, 3, 7, ...], ...],
  "greater_than_signs": {
    "0,0,r": ">",   // sol[0][0]=5 > sol[0][1]=3
    "0,0,b": "<",   // sol[0][0]=5 < sol[1][0]=9
    ...
  }
}
```

Key format same as Kropki.

---

### `diagonal_sx9_1_402.json`
**Source:** https://www.playsudoku.ru/sudoku/sx9_1_402.html
**Type:** DIAGONAL
**Size:** 9×9 — easy difficulty

Both main diagonals (top-left→bottom-right and top-right→bottom-left) must each
contain digits 1–9 exactly once, in addition to the standard row/column/box rules.

No extra constraint data needed — the diagonal rule is fixed for all 9×9 boards.

Format:
```json
{
  "puzzle": [[0, 6, ...], ...],
  "solution": [[1, 6, ...], ...]
}
```

---

### `windoku_win9_1_021.json`
**Source:** https://www.playsudoku.ru/windoku/win9_1_021.html
**Type:** WINDOKU
**Size:** 9×9 — easy difficulty

Four extra 3×3 "window" boxes (at rows 1–3 cols 1–3, rows 1–3 cols 5–7,
rows 5–7 cols 1–3, rows 5–7 cols 5–7, all 0-indexed) must each contain
digits 1–9 exactly once. The windows are always the same positions.

Format:
```json
{
  "puzzle": [[0, 9, ...], ...],
  "solution": [[8, 9, ...], ...]
}
```

---

### `anti_knight_skn9_1_050.json`
**Source:** https://www.playsudoku.ru/antiknight/skn9_1_050.html
**Type:** ANTI_KNIGHT
**Size:** 9×9 — easy difficulty

No two cells a chess knight's move apart (±1,±2 or ±2,±1) may contain the same
digit. The constraint applies to all 81 cells globally.

Format:
```json
{
  "puzzle": [[5, 0, ...], ...],
  "solution": [[5, 6, ...], ...]
}
```

---

### `anti_king_stl9_4_045.json`
**Source:** https://www.playsudoku.ru/antiking/stl9_4_045.html
**Type:** ANTI_KING
**Size:** 9×9 — hard difficulty

No two cells a chess king's move apart (all 8 orthogonal and diagonal neighbours)
may contain the same digit. This extends the no-repeat constraint to diagonal
adjacency as well.

Format:
```json
{
  "puzzle": [[0, 9, ...], ...],
  "solution": [[1, 9, ...], ...]
}
```

---

### `non_consecutive_snc9_1_040.json`
**Source:** https://www.playsudoku.ru/nonconsecutive/snc9_1_040.html
**Type:** NON_CONSECUTIVE
**Size:** 9×9 — easy difficulty

No two orthogonally adjacent cells may contain consecutive digits (i.e. digits
differing by exactly 1). Applies globally to all cell pairs.

Format:
```json
{
  "puzzle": [[0, 0, 4, ...], ...],
  "solution": [[5, 7, 4, ...], ...]
}
```

---

### `odd_even_soe1_345.json`
**Source:** https://www.playsudoku.ru/oddeven/soe1_345.html
**Type:** ODD_EVEN
**Size:** 9×9 — easy difficulty

Every cell is pre-labelled odd (`"o"`) or even (`"e"`). Odd-labelled cells must
receive an odd digit (1, 3, 5, 7, 9); even-labelled cells must receive an even
digit (2, 4, 6, 8). The mask is derived from the solution.

Format:
```json
{
  "puzzle": [[0, 4, 5, ...], ...],
  "solution": [[9, 4, 5, ...], ...],
  "odd_even_mask": [
    ["o", "e", "o", ...],
    ...
  ]
}
```

---

## Usage

Load an example and evaluate it with the Python solver:

```python
import json, sys
sys.path.insert(0, '..')   # from examples/ directory
from solver import solve
from generator import count_solutions

# Killer example
with open('killer_skl9_1_005.json') as f:
    ex = json.load(f)

cages = [{'cells': [tuple(c) for c in cage['cells']], 'sum': cage['sum']}
         for cage in ex['killer_cages']]

result = solve(ex['puzzle'], 'KILLER', killer_cages=cages)
print(result.solved, result.difficulty)

# Check uniqueness
n = count_solutions(ex['puzzle'], 'KILLER', killer_cages=cages)
print('unique:', n == 1)

# Global-rule variants (no extra data)
with open('diagonal_sx9_1_402.json') as f:
    ex = json.load(f)

result = solve(ex['puzzle'], 'DIAGONAL')
print(result.solved, result.difficulty)

# ODD_EVEN (mask stored in file)
with open('odd_even_soe1_345.json') as f:
    ex = json.load(f)

result = solve(ex['puzzle'], 'ODD_EVEN', odd_even_mask=ex['odd_even_mask'])
print(result.solved, result.difficulty)
```

---

## Notes on missing types

- **THERMO** and **SANDWICH** — not available on playsudoku.ru.
  Minimal hand-crafted test cases are in `tests/test_candidates.py`.
- **LITTLE_KILLER** — not available on playsudoku.ru.
  Test cases constructed manually in `tests/test_candidates.py`.
- **FRAME** — available on playsudoku.ru (`/frame/frame_215.html`) but not
  implemented in this project.
