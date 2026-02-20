"""
Sudoku solving techniques, ordered from easiest to hardest.

Each technique function:
  - Takes a CandidateGrid
  - Returns a Step if it found and applied a move, else None
  - Applies exactly ONE move (the first found) and returns immediately
  - The caller (solver.py) restarts from the easiest technique after each step

Techniques implemented (in difficulty order):
  1. Naked Single
  2. Hidden Single
  3. Locked Candidates (Pointing + Claiming)
  4. Naked Pair / Triple / Quad
  5. Hidden Pair / Triple / Quad
  6. X-Wing / Swordfish / Jellyfish
  7. XY-Wing
  8. Simple Coloring
"""

from dataclasses import dataclass, field
from itertools import combinations

from candidates import CandidateGrid, DIGIT_BIT, _bits_to_digits, _popcount


# ---------------------------------------------------------------------------
# Step — result of applying a technique
# ---------------------------------------------------------------------------

@dataclass
class Step:
    technique: str
    score: int
    # Human-readable description (useful for debugging / explanation mode)
    description: str = ''
    # What was placed or eliminated (for tracing)
    placements: list[tuple[int, int, int]] = field(default_factory=list)   # (r, c, digit)
    eliminations: list[tuple[int, int, int]] = field(default_factory=list) # (r, c, digit)


# ---------------------------------------------------------------------------
# Scores (inspired by Hodoku, tuned for our 4-level scale)
# ---------------------------------------------------------------------------

SCORES = {
    'NAKED_SINGLE':      1,    # trivial, low score so they don't dominate
    'HIDDEN_SINGLE':     10,
    'LOCKED_CANDIDATES': 30,
    'NAKED_PAIR':        40,
    'HIDDEN_PAIR':       50,
    'NAKED_TRIPLE':      80,
    'HIDDEN_TRIPLE':     90,
    'NAKED_QUAD':       110,
    'HIDDEN_QUAD':      120,
    'X_WING':           150,
    'SWORDFISH':        200,
    'JELLYFISH':        250,
    'XY_WING':          200,
    'SIMPLE_COLORING':  350,
}

# Difficulty level of each technique.
# PRIMARY basis for difficulty classification — the hardest technique
# required to solve a puzzle determines its minimum difficulty level.
TECHNIQUE_LEVEL = {
    'NAKED_SINGLE':      'EASY',
    'HIDDEN_SINGLE':     'MEDIUM',   # requires scanning houses, not trivial
    'LOCKED_CANDIDATES': 'MEDIUM',
    'NAKED_PAIR':        'MEDIUM',
    'HIDDEN_PAIR':       'MEDIUM',
    'NAKED_TRIPLE':      'HARD',
    'HIDDEN_TRIPLE':     'HARD',
    'NAKED_QUAD':        'HARD',
    'HIDDEN_QUAD':       'HARD',
    'X_WING':            'HARD',
    'SWORDFISH':         'HARD',
    'JELLYFISH':         'HARD',
    'XY_WING':           'HARD',
    'SIMPLE_COLORING':   'EXPERT',
}

# Ordered list of technique functions (defined below, registered at module end)
TECHNIQUES: list = []


# ---------------------------------------------------------------------------
# 1. Naked Single
#    A cell has exactly one candidate → place it.
# ---------------------------------------------------------------------------

def naked_single(cg: CandidateGrid) -> Step | None:
    for r in range(9):
        for c in range(9):
            if cg.is_empty(r, c) and cg.candidate_count(r, c) == 1:
                digit = cg.candidates(r, c)[0]
                cg.place(r, c, digit)
                return Step(
                    technique='NAKED_SINGLE',
                    score=SCORES['NAKED_SINGLE'],
                    description=f'Naked Single: place {digit} at ({r},{c})',
                    placements=[(r, c, digit)],
                )
    return None


# ---------------------------------------------------------------------------
# 2. Hidden Single
#    In some house, a digit can go in exactly one cell → place it.
# ---------------------------------------------------------------------------

def hidden_single(cg: CandidateGrid) -> Step | None:
    for house in cg.get_houses():
        for digit in range(1, 10):
            bit = DIGIT_BIT[digit]
            positions = [(r, c) for r, c in house if cg.is_empty(r, c) and cg.candidate_bits(r, c) & bit]
            if len(positions) == 1:
                r, c = positions[0]
                cg.place(r, c, digit)
                return Step(
                    technique='HIDDEN_SINGLE',
                    score=SCORES['HIDDEN_SINGLE'],
                    description=f'Hidden Single: place {digit} at ({r},{c})',
                    placements=[(r, c, digit)],
                )
    return None


# ---------------------------------------------------------------------------
# 3. Locked Candidates
#
#    Pointing (Type 1):
#      Digit in a box is confined to one row/col → eliminate from that
#      row/col outside the box.
#
#    Claiming (Type 2):
#      Digit in a row/col is confined to one box → eliminate from that
#      box outside the row/col.
# ---------------------------------------------------------------------------

def locked_candidates(cg: CandidateGrid) -> Step | None:
    # --- Pointing ---
    for br in range(3):
        for bc in range(3):
            box_cells = [
                (br * 3 + dr, bc * 3 + dc)
                for dr in range(3) for dc in range(3)
            ]
            for digit in range(1, 10):
                bit = DIGIT_BIT[digit]
                positions = [(r, c) for r, c in box_cells if cg.is_empty(r, c) and cg.candidate_bits(r, c) & bit]
                if len(positions) < 2:
                    continue

                rows = {r for r, c in positions}
                cols = {c for r, c in positions}

                elims = []
                if len(rows) == 1:
                    # All in the same row → eliminate from rest of row
                    locked_row = next(iter(rows))
                    for c in range(9):
                        if bc * 3 <= c <= bc * 3 + 2:
                            continue  # inside the box
                        if cg.is_empty(locked_row, c) and cg.candidate_bits(locked_row, c) & bit:
                            elims.append((locked_row, c, digit))

                elif len(cols) == 1:
                    # All in the same col → eliminate from rest of col
                    locked_col = next(iter(cols))
                    for r in range(9):
                        if br * 3 <= r <= br * 3 + 2:
                            continue  # inside the box
                        if cg.is_empty(r, locked_col) and cg.candidate_bits(r, locked_col) & bit:
                            elims.append((r, locked_col, digit))

                if elims:
                    for r, c, d in elims:
                        cg.eliminate(r, c, d)
                    return Step(
                        technique='LOCKED_CANDIDATES',
                        score=SCORES['LOCKED_CANDIDATES'],
                        description=f'Locked Candidates (Pointing): {digit} in box ({br},{bc})',
                        eliminations=elims,
                    )

    # --- Claiming ---
    # rows
    for r in range(9):
        for digit in range(1, 10):
            bit = DIGIT_BIT[digit]
            positions = [(r, c) for c in range(9) if cg.is_empty(r, c) and cg.candidate_bits(r, c) & bit]
            if len(positions) < 2:
                continue
            box_cols = {c // 3 for _, c in positions}
            if len(box_cols) == 1:
                bc = next(iter(box_cols))
                br = r // 3
                elims = []
                for dr in range(3):
                    for dc in range(3):
                        er, ec = br * 3 + dr, bc * 3 + dc
                        if er == r:
                            continue  # same row, skip
                        if cg.is_empty(er, ec) and cg.candidate_bits(er, ec) & bit:
                            elims.append((er, ec, digit))
                if elims:
                    for er, ec, d in elims:
                        cg.eliminate(er, ec, d)
                    return Step(
                        technique='LOCKED_CANDIDATES',
                        score=SCORES['LOCKED_CANDIDATES'],
                        description=f'Locked Candidates (Claiming row): {digit} in row {r}',
                        eliminations=elims,
                    )

    # cols
    for c in range(9):
        for digit in range(1, 10):
            bit = DIGIT_BIT[digit]
            positions = [(r, c) for r in range(9) if cg.is_empty(r, c) and cg.candidate_bits(r, c) & bit]
            if len(positions) < 2:
                continue
            box_rows = {r // 3 for r, _ in positions}
            if len(box_rows) == 1:
                br = next(iter(box_rows))
                bc = c // 3
                elims = []
                for dr in range(3):
                    for dc in range(3):
                        er, ec = br * 3 + dr, bc * 3 + dc
                        if ec == c:
                            continue  # same col, skip
                        if cg.is_empty(er, ec) and cg.candidate_bits(er, ec) & bit:
                            elims.append((er, ec, digit))
                if elims:
                    for er, ec, d in elims:
                        cg.eliminate(er, ec, d)
                    return Step(
                        technique='LOCKED_CANDIDATES',
                        score=SCORES['LOCKED_CANDIDATES'],
                        description=f'Locked Candidates (Claiming col): {digit} in col {c}',
                        eliminations=elims,
                    )

    return None


# ---------------------------------------------------------------------------
# 4 & 5. Naked / Hidden Subsets (Pairs, Triples, Quads)
#
#    Naked Subset of size N:
#      N cells in a house whose combined candidates contain exactly N digits
#      → eliminate those digits from the rest of the house.
#
#    Hidden Subset of size N:
#      N digits in a house that only appear in exactly N cells
#      → remove all other candidates from those N cells.
# ---------------------------------------------------------------------------

def _naked_subset(cg: CandidateGrid, size: int) -> Step | None:
    technique = {2: 'NAKED_PAIR', 3: 'NAKED_TRIPLE', 4: 'NAKED_QUAD'}[size]
    for house in cg.get_houses():
        empty_cells = [(r, c) for r, c in house if cg.is_empty(r, c)]
        if len(empty_cells) < size + 1:
            continue
        for combo in combinations(empty_cells, size):
            # Union of candidates across the combo
            combined = 0
            for r, c in combo:
                combined |= cg.candidate_bits(r, c)
            if _popcount(combined) != size:
                continue
            # Eliminate these digits from other cells in the house
            elims = []
            for r, c in house:
                if not cg.is_empty(r, c) or (r, c) in combo:
                    continue
                for digit in _bits_to_digits(combined):
                    if cg.candidate_bits(r, c) & DIGIT_BIT[digit]:
                        elims.append((r, c, digit))
            if elims:
                for r, c, d in elims:
                    cg.eliminate(r, c, d)
                combo_str = '+'.join(f'({r},{c})' for r, c in combo)
                return Step(
                    technique=technique,
                    score=SCORES[technique],
                    description=f'{technique}: {combo_str} → digits {_bits_to_digits(combined)}',
                    eliminations=elims,
                )
    return None


def _hidden_subset(cg: CandidateGrid, size: int) -> Step | None:
    technique = {2: 'HIDDEN_PAIR', 3: 'HIDDEN_TRIPLE', 4: 'HIDDEN_QUAD'}[size]
    for house in cg.get_houses():
        empty_cells = [(r, c) for r, c in house if cg.is_empty(r, c)]
        if len(empty_cells) < size + 1:
            continue
        # Collect digits that appear in 2..size cells only
        digit_positions: dict[int, list[tuple[int, int]]] = {}
        for digit in range(1, 10):
            bit = DIGIT_BIT[digit]
            pos = [(r, c) for r, c in empty_cells if cg.candidate_bits(r, c) & bit]
            if 2 <= len(pos) <= size:
                digit_positions[digit] = pos

        for digit_combo in combinations(digit_positions.keys(), size):
            # All cells that contain any of these digits
            cells_involved: set[tuple[int, int]] = set()
            for d in digit_combo:
                cells_involved.update(digit_positions[d])
            if len(cells_involved) != size:
                continue
            # Remove all OTHER candidates from those cells
            combo_bits = sum(DIGIT_BIT[d] for d in digit_combo)
            elims = []
            for r, c in cells_involved:
                extra = cg.candidate_bits(r, c) & ~combo_bits
                for digit in _bits_to_digits(extra):
                    elims.append((r, c, digit))
            if elims:
                for r, c, d in elims:
                    cg.eliminate(r, c, d)
                return Step(
                    technique=technique,
                    score=SCORES[technique],
                    description=f'{technique}: digits {list(digit_combo)}',
                    eliminations=elims,
                )
    return None


def naked_pair(cg: CandidateGrid) -> Step | None:
    return _naked_subset(cg, 2)

def naked_triple(cg: CandidateGrid) -> Step | None:
    return _naked_subset(cg, 3)

def naked_quad(cg: CandidateGrid) -> Step | None:
    return _naked_subset(cg, 4)

def hidden_pair(cg: CandidateGrid) -> Step | None:
    return _hidden_subset(cg, 2)

def hidden_triple(cg: CandidateGrid) -> Step | None:
    return _hidden_subset(cg, 3)

def hidden_quad(cg: CandidateGrid) -> Step | None:
    return _hidden_subset(cg, 4)


# ---------------------------------------------------------------------------
# 6. Basic Fish: X-Wing (2), Swordfish (3), Jellyfish (4)
#
#    For a digit d and N rows: if d appears in those N rows only in the
#    same N columns, eliminate d from those columns in all other rows.
#    Same logic applies column-wise.
# ---------------------------------------------------------------------------

def _basic_fish(cg: CandidateGrid, size: int) -> Step | None:
    technique = {2: 'X_WING', 3: 'SWORDFISH', 4: 'JELLYFISH'}[size]

    for digit in range(1, 10):
        bit = DIGIT_BIT[digit]

        # Row-based fish
        row_cols: list[frozenset[int]] = []
        for r in range(9):
            cols = frozenset(c for c in range(9) if cg.is_empty(r, c) and cg.candidate_bits(r, c) & bit)
            row_cols.append(cols)

        for base_rows in combinations(range(9), size):
            base_cols: set[int] = set()
            for r in base_rows:
                base_cols |= row_cols[r]
            if len(base_cols) != size:
                continue
            elims = []
            for r in range(9):
                if r in base_rows:
                    continue
                for c in base_cols:
                    if cg.is_empty(r, c) and cg.candidate_bits(r, c) & bit:
                        elims.append((r, c, digit))
            if elims:
                for r, c, d in elims:
                    cg.eliminate(r, c, d)
                return Step(
                    technique=technique,
                    score=SCORES[technique],
                    description=f'{technique}: digit {digit}, rows {base_rows}, cols {sorted(base_cols)}',
                    eliminations=elims,
                )

        # Column-based fish
        col_rows: list[frozenset[int]] = []
        for c in range(9):
            rows = frozenset(r for r in range(9) if cg.is_empty(r, c) and cg.candidate_bits(r, c) & bit)
            col_rows.append(rows)

        for base_cols in combinations(range(9), size):
            base_rows_set: set[int] = set()
            for c in base_cols:
                base_rows_set |= col_rows[c]
            if len(base_rows_set) != size:
                continue
            elims = []
            for c in range(9):
                if c in base_cols:
                    continue
                for r in base_rows_set:
                    if cg.is_empty(r, c) and cg.candidate_bits(r, c) & bit:
                        elims.append((r, c, digit))
            if elims:
                for r, c, d in elims:
                    cg.eliminate(r, c, d)
                return Step(
                    technique=technique,
                    score=SCORES[technique],
                    description=f'{technique}: digit {digit}, cols {base_cols}, rows {sorted(base_rows_set)}',
                    eliminations=elims,
                )

    return None


def x_wing(cg: CandidateGrid) -> Step | None:
    return _basic_fish(cg, 2)

def swordfish(cg: CandidateGrid) -> Step | None:
    return _basic_fish(cg, 3)

def jellyfish(cg: CandidateGrid) -> Step | None:
    return _basic_fish(cg, 4)


# ---------------------------------------------------------------------------
# 7. XY-Wing
#
#    Find a pivot cell with exactly 2 candidates {X, Y}.
#    Find two pincers that each share a house with the pivot:
#      pincer_1 has candidates {X, Z}
#      pincer_2 has candidates {Y, Z}
#    Any cell that sees BOTH pincers cannot be Z.
# ---------------------------------------------------------------------------

def xy_wing(cg: CandidateGrid) -> Step | None:
    # Collect all bivalue cells
    bivalue: list[tuple[int, int]] = [
        (r, c) for r in range(9) for c in range(9)
        if cg.is_empty(r, c) and cg.candidate_count(r, c) == 2
    ]

    for pr, pc in bivalue:
        pivot_bits = cg.candidate_bits(pr, pc)
        x_bit, y_bit = _two_bits(pivot_bits)
        pivot_peers = cg.get_peers(pr, pc)

        # Pincers must be bivalue cells that see the pivot
        pivot_bivalue_peers = [
            (r, c) for r, c in pivot_peers
            if cg.is_empty(r, c) and cg.candidate_count(r, c) == 2
        ]

        for p1r, p1c in pivot_bivalue_peers:
            p1_bits = cg.candidate_bits(p1r, p1c)
            # p1 must share exactly one candidate with pivot
            if _popcount(p1_bits & pivot_bits) != 1:
                continue
            # The shared candidate with pivot
            shared1 = p1_bits & pivot_bits          # one of {X} or {Y}
            z_bit = p1_bits & ~pivot_bits            # the Z candidate

            for p2r, p2c in pivot_bivalue_peers:
                if (p2r, p2c) == (p1r, p1c):
                    continue
                p2_bits = cg.candidate_bits(p2r, p2c)
                # p2 must share the OTHER candidate of pivot with it
                shared2 = p2_bits & pivot_bits
                if shared2 == shared1 or _popcount(shared2) != 1:
                    continue
                # p2 must carry the same Z
                if (p2_bits & ~pivot_bits) != z_bit:
                    continue

                # Eliminate Z from cells seeing BOTH pincers
                p1_peers = cg.get_peers(p1r, p1c)
                p2_peers = cg.get_peers(p2r, p2c)
                common_peers = p1_peers & p2_peers
                z_digit = _bits_to_digits(z_bit)[0]

                elims = []
                for r, c in common_peers:
                    if (r, c) in {(pr, pc), (p1r, p1c), (p2r, p2c)}:
                        continue
                    if cg.is_empty(r, c) and cg.candidate_bits(r, c) & z_bit:
                        elims.append((r, c, z_digit))

                if elims:
                    for r, c, d in elims:
                        cg.eliminate(r, c, d)
                    return Step(
                        technique='XY_WING',
                        score=SCORES['XY_WING'],
                        description=(
                            f'XY-Wing: pivot ({pr},{pc}) '
                            f'pincers ({p1r},{p1c}) ({p2r},{p2c}) '
                            f'eliminate {z_digit}'
                        ),
                        eliminations=elims,
                    )
    return None


def _two_bits(bits: int) -> tuple[int, int]:
    """Extract the two set bits from a 2-bit integer."""
    low = bits & (-bits)           # lowest set bit
    high = bits & ~low             # the other one
    return low, high


# ---------------------------------------------------------------------------
# 8. Simple Coloring (Single-Digit Coloring)
#
#    For each digit, build a bipartite graph from strong links
#    (a digit appears in exactly 2 cells in a house → strong link).
#    Color nodes with 0/1 (alternating). Then:
#
#    Rule 2 (Color Trap):
#      An uncolored cell sees a cell of color 0 AND a cell of color 1
#      → eliminate the digit from that cell.
#
#    Rule 4 (Color Wrap):
#      Two cells of the same color share a house
#      → that entire color group is wrong, eliminate from all of them.
# ---------------------------------------------------------------------------

def simple_coloring(cg: CandidateGrid) -> Step | None:
    for digit in range(1, 10):
        bit = DIGIT_BIT[digit]

        # Build strong-link graph
        # strong_links[cell] = list of cells strongly linked to it
        strong_links: dict[tuple[int, int], list[tuple[int, int]]] = {}

        for house in cg.get_houses():
            positions = [(r, c) for r, c in house if cg.is_empty(r, c) and cg.candidate_bits(r, c) & bit]
            if len(positions) == 2:
                a, b = positions
                strong_links.setdefault(a, []).append(b)
                strong_links.setdefault(b, []).append(a)

        # Find connected components and 2-color them
        color: dict[tuple[int, int], int] = {}
        components: list[dict[tuple[int, int], int]] = []

        for start in strong_links:
            if start in color:
                continue
            # BFS
            component: dict[tuple[int, int], int] = {}
            queue = [start]
            component[start] = 0
            while queue:
                node = queue.pop()
                for neighbor in strong_links.get(node, []):
                    if neighbor not in component:
                        component[neighbor] = 1 - component[node]
                        queue.append(neighbor)
            color.update(component)
            components.append(component)

        for component in components:
            cells_0 = {cell for cell, c in component.items() if c == 0}
            cells_1 = {cell for cell, c in component.items() if c == 1}

            # Rule 4: Color Wrap — two same-color cells in same house
            for house in cg.get_houses():
                house_set = set(house)
                wrap_0 = cells_0 & house_set
                wrap_1 = cells_1 & house_set
                for bad_cells in (wrap_0, wrap_1):
                    if len(bad_cells) >= 2:
                        # All cells of this color are wrong → eliminate
                        elims = []
                        for r, c in bad_cells:
                            if cg.is_empty(r, c) and cg.candidate_bits(r, c) & bit:
                                elims.append((r, c, digit))
                        if elims:
                            for r, c, d in elims:
                                cg.eliminate(r, c, d)
                            return Step(
                                technique='SIMPLE_COLORING',
                                score=SCORES['SIMPLE_COLORING'],
                                description=f'Simple Coloring (Wrap): digit {digit}',
                                eliminations=elims,
                            )

            # Rule 2: Color Trap — uncolored cell sees both colors
            all_cells_with_digit = [
                (r, c) for r in range(9) for c in range(9)
                if cg.is_empty(r, c) and cg.candidate_bits(r, c) & bit
            ]
            elims = []
            for r, c in all_cells_with_digit:
                if (r, c) in component:
                    continue
                peers = cg.get_peers(r, c)
                sees_0 = bool(peers & cells_0)
                sees_1 = bool(peers & cells_1)
                if sees_0 and sees_1:
                    elims.append((r, c, digit))

            if elims:
                for r, c, d in elims:
                    cg.eliminate(r, c, d)
                return Step(
                    technique='SIMPLE_COLORING',
                    score=SCORES['SIMPLE_COLORING'],
                    description=f'Simple Coloring (Trap): digit {digit}',
                    eliminations=elims,
                )

    return None


# ---------------------------------------------------------------------------
# Ordered technique list — the solver tries these in order
# ---------------------------------------------------------------------------

TECHNIQUES = [
    naked_single,
    hidden_single,
    locked_candidates,
    naked_pair,
    hidden_pair,
    naked_triple,
    hidden_triple,
    naked_quad,
    hidden_quad,
    x_wing,
    swordfish,
    jellyfish,
    xy_wing,
    simple_coloring,
]
