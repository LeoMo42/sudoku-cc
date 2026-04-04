"""
CandidateGrid — bitset-based candidate tracker for Sudoku variants.

Representation:
    grid[r][c] is a 9-bit integer.
    Bit i (0-indexed) being set means digit (i+1) is a candidate.
    Example: 0b000000101 = digits 1 and 3 are possible.

    ALL_CANDIDATES = 0b111111111 = 511
    Filled cell:    grid[r][c] = 0
"""

from itertools import combinations as _combinations_stdlib

ALL_CANDIDATES = (1 << 9) - 1  # 511

# Precomputed digit → bit mapping. Index 0 unused (padding), indices 1-9 valid.
DIGIT_BIT = [0] + [1 << (d - 1) for d in range(1, 10)]  # DIGIT_BIT[d] = bit for digit d

# Windoku extra box top-left corners (0-indexed)
WINDOKU_WINDOWS = [(1, 1), (1, 5), (5, 1), (5, 5)]

# Knight's move offsets
KNIGHT_MOVES = [(-2, -1), (-2, 1), (-1, -2), (-1, 2),
                (1, -2),  (1, 2),  (2, -1),  (2, 1)]

# King's diagonal offsets (orthogonals are already covered by row/col peers)
KING_DIAGONALS = [(-1, -1), (-1, 1), (1, -1), (1, 1)]

# Orthogonal offsets (for Non-Consecutive)
ORTHOGONALS = [(-1, 0), (1, 0), (0, -1), (0, 1)]


def _bits_to_digits(bits: int) -> list[int]:
    """Convert a bitset to a list of digits."""
    digits = []
    b = bits
    d = 1
    while b:
        if b & 1:
            digits.append(d)
        b >>= 1
        d += 1
    return digits


def _popcount(bits: int) -> int:
    """Count set bits (Brian Kernighan's algorithm)."""
    count = 0
    while bits:
        bits &= bits - 1
        count += 1
    return count


def _bits_for_range(lo: int, hi: int) -> int:
    """Return bitset for digits in [lo, hi] inclusive (clamped to 1-9)."""
    bits = 0
    for d in range(max(1, lo), min(9, hi) + 1):
        bits |= DIGIT_BIT[d]
    return bits


def _killer_valid_digits(n: int, target: int, excluded: set[int]) -> set[int]:
    """
    Return set of digits that appear in any valid n-cell killer combination
    summing to target, without using any digit in `excluded`.
    """
    valid: set[int] = set()
    for combo in _combinations_stdlib(range(1, 10), n):
        if sum(combo) == target and not set(combo) & excluded:
            valid.update(combo)
    return valid


class CandidateGrid:
    """
    Tracks candidates for all cells with O(1) bit operations.

    Supports sudoku types:
        CLASSIC, DIAGONAL, WINDOKU, ANTI_KNIGHT, ANTI_KING,
        NON_CONSECUTIVE, ODD_EVEN,
        KILLER, KROPKI, GREATER_THAN, THERMO, SANDWICH, LITTLE_KILLER

    Parameters
    ----------
    board : list[list[int]]
        9×9 board, 0 = empty cell.
    sudoku_type : str
        One of the type IDs above.
    odd_even_mask : list[list[str]] | None
        Required for ODD_EVEN type. Each cell is 'odd', 'even', or None.
    killer_cages : list[dict] | None
        For KILLER. Each dict: {'cells': [(r, c), ...], 'sum': int}
    kropki_dots : dict[str, str] | None
        For KROPKI. Keys: "r,c,r" (right edge) or "r,c,b" (bottom edge).
        Values: 'white' (|A-B|=1) or 'black' (one is double the other).
        A missing key means no dot — negative constraint (neither relation holds).
    greater_than_signs : dict[str, str] | None
        For GREATER_THAN. Same key format as kropki_dots.
        Values: '>' or '<'. Sign relates left/top cell to right/bottom cell.
        All 144 internal edges must be present.
    thermos : list[list[tuple[int, int]]] | None
        For THERMO. Each thermo is an ordered list of (row, col) pairs,
        bulb first. Digits must strictly increase from bulb to tip.
    sandwich_clues : dict | None
        For SANDWICH. {'rows': [int]*9, 'cols': [int]*9}.
        sandwich_clues['rows'][r] = sum of digits strictly between 1 and 9 in row r.
    little_killer_clues : list[dict] | None
        For LITTLE_KILLER. Each dict: {'cells': [(r, c), ...], 'sum': int}.
        Digits may repeat along the diagonal.
    """

    def __init__(
        self,
        board: list[list[int]],
        sudoku_type: str = 'CLASSIC',
        odd_even_mask: list[list[str]] | None = None,
        killer_cages: list[dict] | None = None,
        kropki_dots: dict[str, str] | None = None,
        greater_than_signs: dict[str, str] | None = None,
        thermos: list[list[tuple[int, int]]] | None = None,
        sandwich_clues: dict | None = None,
        little_killer_clues: list[dict] | None = None,
    ):
        self.sudoku_type = sudoku_type
        self.odd_even_mask = odd_even_mask
        self.killer_cages = killer_cages
        self.kropki_dots = kropki_dots
        self.greater_than_signs = greater_than_signs
        self.thermos = thermos
        self.sandwich_clues = sandwich_clues
        self.little_killer_clues = little_killer_clues
        self.board = [row[:] for row in board]
        self.grid = [[0] * 9 for _ in range(9)]

        # Precompute houses once — used heavily by technique solvers
        self._houses: list[list[tuple[int, int]]] | None = None
        # Precompute peer sets once
        self._peer_cache: dict[tuple[int, int], set[tuple[int, int]]] = {}

        # Build thermo position lookup: (r, c) -> [(thermo_idx, pos_in_thermo), ...]
        self._thermo_positions: dict[tuple[int, int], list[tuple[int, int]]] = {}
        if thermos:
            for ti, thermo in enumerate(thermos):
                for pi, cell in enumerate(thermo):
                    rc = (cell[0], cell[1])
                    if rc not in self._thermo_positions:
                        self._thermo_positions[rc] = []
                    self._thermo_positions[rc].append((ti, pi))

        # Build killer cage lookup: (r, c) -> cage dict
        self._cell_to_cage: dict[tuple[int, int], dict] = {}
        if killer_cages:
            for cage in killer_cages:
                for cell in cage['cells']:
                    self._cell_to_cage[(cell[0], cell[1])] = cage

        # Build little killer lookup: (r, c) -> [clue, ...]
        self._cell_to_lk: dict[tuple[int, int], list[dict]] = {}
        if little_killer_clues:
            for clue in little_killer_clues:
                for cell in clue['cells']:
                    rc = (cell[0], cell[1])
                    if rc not in self._cell_to_lk:
                        self._cell_to_lk[rc] = []
                    self._cell_to_lk[rc].append(clue)

        self._initialize()

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    def _initialize(self) -> None:
        """Set up initial candidates from the given board."""
        # 1. All empty cells start with all candidates
        for r in range(9):
            for c in range(9):
                self.grid[r][c] = 0 if self.board[r][c] != 0 else ALL_CANDIDATES

        # 2. ODD_EVEN: restrict by cell parity before anything else
        if self.sudoku_type == 'ODD_EVEN' and self.odd_even_mask:
            ODD_BITS  = 0b101010101  # digits 1,3,5,7,9  (bits 0,2,4,6,8)
            EVEN_BITS = 0b010101010  # digits 2,4,6,8    (bits 1,3,5,7)
            for r in range(9):
                for c in range(9):
                    if self.board[r][c] == 0:
                        parity = self.odd_even_mask[r][c]
                        if parity == 'odd':
                            self.grid[r][c] &= ODD_BITS
                        elif parity == 'even':
                            self.grid[r][c] &= EVEN_BITS

        # 3. THERMO: restrict each cell by its position in the thermo.
        #    At position i in a thermo of length n:
        #      min value = i+1  (i cells must come before it, each ≥ 1)
        #      max value = 9-(n-1-i)  (n-1-i cells must come after it, each ≤ 9)
        if self.sudoku_type == 'THERMO' and self.thermos:
            for thermo in self.thermos:
                n = len(thermo)
                for i, cell in enumerate(thermo):
                    r, c = cell[0], cell[1]
                    if self.board[r][c] == 0:
                        min_val = i + 1
                        max_val = 9 - (n - 1 - i)
                        self.grid[r][c] &= _bits_for_range(min_val, max_val)

        # 4. KILLER: restrict each empty cage cell to digits that appear in
        #    any valid combination of the remaining empty cells.
        if self.sudoku_type == 'KILLER' and self.killer_cages:
            for cage in self.killer_cages:
                cells = cage['cells']
                placed_digits = {self.board[cell[0]][cell[1]]
                                 for cell in cells if self.board[cell[0]][cell[1]] != 0}
                placed_sum = sum(placed_digits)  # digits are unique within cage
                n_empty = sum(1 for cell in cells if self.board[cell[0]][cell[1]] == 0)
                if n_empty == 0:
                    continue
                remaining_sum = cage['sum'] - placed_sum
                valid = _killer_valid_digits(n_empty, remaining_sum, placed_digits)
                valid_bits = 0
                for d in valid:
                    valid_bits |= DIGIT_BIT[d]
                for cell in cells:
                    r, c = cell[0], cell[1]
                    if self.board[r][c] == 0:
                        self.grid[r][c] &= valid_bits

        # 5. Eliminate based on every filled digit (propagates all variant constraints)
        for r in range(9):
            for c in range(9):
                if self.board[r][c] != 0:
                    self._apply_placement(r, c, self.board[r][c])

    # ------------------------------------------------------------------
    # Core placement / elimination
    # ------------------------------------------------------------------

    def place(self, row: int, col: int, digit: int) -> None:
        """
        Place digit at (row, col).
        Updates board, clears the cell's candidates, and propagates.
        """
        self.board[row][col] = digit
        self.grid[row][col] = 0
        self._apply_placement(row, col, digit)

    def _apply_placement(self, row: int, col: int, digit: int) -> None:
        """Eliminate digit from peers + apply variant constraints."""
        bit = DIGIT_BIT[digit]

        # Standard peers: same row, column, box
        for r in range(9):
            self.grid[r][col] &= ~bit
        for c in range(9):
            self.grid[row][c] &= ~bit
        br, bc = (row // 3) * 3, (col // 3) * 3
        for r in range(br, br + 3):
            for c in range(bc, bc + 3):
                self.grid[r][c] &= ~bit

        # Make sure the placed cell stays at 0
        self.grid[row][col] = 0

        # --- Variant-specific eliminations ---

        if self.sudoku_type == 'DIAGONAL':
            if row == col:                      # main diagonal ↘
                for i in range(9):
                    self.grid[i][i] &= ~bit
                self.grid[row][col] = 0
            if row + col == 8:                  # anti-diagonal ↙
                for i in range(9):
                    self.grid[i][8 - i] &= ~bit
                self.grid[row][col] = 0

        elif self.sudoku_type == 'WINDOKU':
            for wr, wc in WINDOKU_WINDOWS:
                if wr <= row <= wr + 2 and wc <= col <= wc + 2:
                    for r in range(wr, wr + 3):
                        for c in range(wc, wc + 3):
                            self.grid[r][c] &= ~bit
                    self.grid[row][col] = 0
                    break

        elif self.sudoku_type == 'ANTI_KNIGHT':
            for dr, dc in KNIGHT_MOVES:
                r, c = row + dr, col + dc
                if 0 <= r < 9 and 0 <= c < 9:
                    self.grid[r][c] &= ~bit

        elif self.sudoku_type == 'ANTI_KING':
            for dr, dc in KING_DIAGONALS:
                r, c = row + dr, col + dc
                if 0 <= r < 9 and 0 <= c < 9:
                    self.grid[r][c] &= ~bit

        elif self.sudoku_type == 'NON_CONSECUTIVE':
            lo_bit = DIGIT_BIT[digit - 1] if digit > 1 else 0
            hi_bit = DIGIT_BIT[digit + 1] if digit < 9 else 0
            mask = lo_bit | hi_bit
            for dr, dc in ORTHOGONALS:
                r, c = row + dr, col + dc
                if 0 <= r < 9 and 0 <= c < 9:
                    self.grid[r][c] &= ~mask

        elif self.sudoku_type == 'THERMO' and self.thermos:
            self._apply_thermo(row, col, digit)

        elif self.sudoku_type == 'GREATER_THAN' and self.greater_than_signs:
            self._apply_greater_than(row, col, digit)

        elif self.sudoku_type == 'KILLER' and self.killer_cages:
            self._apply_killer(row, col, digit)

        elif self.sudoku_type == 'KROPKI' and self.kropki_dots is not None:
            self._apply_kropki(row, col, digit)

        elif self.sudoku_type == 'SANDWICH' and self.sandwich_clues:
            self._apply_sandwich(row, col, digit)

        elif self.sudoku_type == 'LITTLE_KILLER' and self.little_killer_clues:
            self._apply_little_killer(row, col, digit)

    # ------------------------------------------------------------------
    # Variant-specific propagators
    # ------------------------------------------------------------------

    def _apply_thermo(self, row: int, col: int, digit: int) -> None:
        """When digit is placed at (row, col), restrict all thermo neighbours."""
        key = (row, col)
        if key not in self._thermo_positions:
            return
        for ti, pi in self._thermo_positions[key]:
            thermo = self.thermos[ti]
            # Cells before position pi must be strictly less than digit
            ge_mask = _bits_for_range(digit, 9)     # digits >= digit
            for j in range(pi):
                r, c = thermo[j][0], thermo[j][1]
                self.grid[r][c] &= ~ge_mask
            # Cells after position pi must be strictly greater than digit
            le_mask = _bits_for_range(1, digit)     # digits <= digit
            for j in range(pi + 1, len(thermo)):
                r, c = thermo[j][0], thermo[j][1]
                self.grid[r][c] &= ~le_mask

    def _apply_greater_than(self, row: int, col: int, digit: int) -> None:
        """When digit is placed at (row, col), enforce inequality signs with neighbours."""
        signs = self.greater_than_signs
        ge_mask = _bits_for_range(digit, 9)   # digits >= digit (must not be neighbor if neighbor < digit)
        le_mask = _bits_for_range(1, digit)   # digits <= digit

        # Right edge key "row,col,r": sign compares (row,col) vs (row,col+1)
        if col + 1 < 9:
            sign = signs.get(f'{row},{col},r')
            if sign == '>':   # placed > right → right < digit → eliminate ≥ digit from right
                self.grid[row][col + 1] &= ~ge_mask
            elif sign == '<': # placed < right → right > digit → eliminate ≤ digit from right
                self.grid[row][col + 1] &= ~le_mask

        # Left edge key "row,col-1,r": sign compares (row,col-1) vs (row,col)
        if col - 1 >= 0:
            sign = signs.get(f'{row},{col - 1},r')
            if sign == '>':   # left > placed → left > digit → eliminate ≤ digit from left
                self.grid[row][col - 1] &= ~le_mask
            elif sign == '<': # left < placed → left < digit → eliminate ≥ digit from left
                self.grid[row][col - 1] &= ~ge_mask

        # Bottom edge key "row,col,b": sign compares (row,col) vs (row+1,col)
        if row + 1 < 9:
            sign = signs.get(f'{row},{col},b')
            if sign == '>':   # placed > below → below < digit → eliminate ≥ digit from below
                self.grid[row + 1][col] &= ~ge_mask
            elif sign == '<': # placed < below → below > digit → eliminate ≤ digit from below
                self.grid[row + 1][col] &= ~le_mask

        # Top edge key "row-1,col,b": sign compares (row-1,col) vs (row,col)
        if row - 1 >= 0:
            sign = signs.get(f'{row - 1},{col},b')
            if sign == '>':   # above > placed → above > digit → eliminate ≤ digit from above
                self.grid[row - 1][col] &= ~le_mask
            elif sign == '<': # above < placed → above < digit → eliminate ≥ digit from above
                self.grid[row - 1][col] &= ~ge_mask

    def _apply_killer(self, row: int, col: int, digit: int) -> None:
        """When digit is placed, enforce no-repeat and near-complete deduction in cage."""
        cage = self._cell_to_cage.get((row, col))
        if cage is None:
            return
        cells = cage['cells']

        # No-repeat within cage
        bit = DIGIT_BIT[digit]
        for cell in cells:
            r, c = cell[0], cell[1]
            if (r, c) != (row, col):
                self.grid[r][c] &= ~bit

        # If exactly one empty cell remains, its value is fully determined
        empty_cells = [(cell[0], cell[1]) for cell in cells
                       if self.board[cell[0]][cell[1]] == 0]
        if len(empty_cells) == 1:
            r2, c2 = empty_cells[0]
            filled_sum = sum(self.board[cell[0]][cell[1]] for cell in cells
                             if self.board[cell[0]][cell[1]] != 0)
            remaining = cage['sum'] - filled_sum
            if 1 <= remaining <= 9:
                self.grid[r2][c2] &= DIGIT_BIT[remaining]
            else:
                self.grid[r2][c2] = 0  # contradiction

    def _apply_kropki(self, row: int, col: int, digit: int) -> None:
        """When digit is placed, enforce Kropki dot constraints with neighbours."""
        dots = self.kropki_dots
        edges = []
        if col + 1 < 9: edges.append((row, col + 1, f'{row},{col},r'))
        if col - 1 >= 0: edges.append((row, col - 1, f'{row},{col - 1},r'))
        if row + 1 < 9: edges.append((row + 1, col, f'{row},{col},b'))
        if row - 1 >= 0: edges.append((row - 1, col, f'{row - 1},{col},b'))

        for nr, nc, key in edges:
            dot = dots.get(key)  # 'white', 'black', or None (no dot = negative constraint)
            if dot == 'white':
                # Neighbour must be exactly digit±1
                allowed = 0
                if digit > 1: allowed |= DIGIT_BIT[digit - 1]
                if digit < 9: allowed |= DIGIT_BIT[digit + 1]
                self.grid[nr][nc] &= allowed
            elif dot == 'black':
                # Neighbour must be digit*2 or digit//2
                allowed = 0
                if digit * 2 <= 9:   allowed |= DIGIT_BIT[digit * 2]
                if digit % 2 == 0:   allowed |= DIGIT_BIT[digit // 2]
                self.grid[nr][nc] &= allowed
            else:
                # No dot: neighbour must NOT be consecutive or double
                elim = 0
                if digit > 1:        elim |= DIGIT_BIT[digit - 1]
                if digit < 9:        elim |= DIGIT_BIT[digit + 1]
                if digit * 2 <= 9:   elim |= DIGIT_BIT[digit * 2]
                if digit % 2 == 0:   elim |= DIGIT_BIT[digit // 2]
                self.grid[nr][nc] &= ~elim

    def _apply_sandwich(self, row: int, col: int, digit: int) -> None:
        """When 1 or 9 is placed, propagate sandwich clues for the row and column."""
        if digit not in (1, 9):
            return
        clues = self.sandwich_clues
        self._sandwich_line([(row, c) for c in range(9)], clues['rows'][row])
        self._sandwich_line([(r, col) for r in range(9)], clues['cols'][col])

    def _sandwich_line(self, cells: list[tuple[int, int]], clue: int) -> None:
        """Propagate sandwich constraint on a line once both 1 and 9 are placed."""
        values = [self.board[r][c] for r, c in cells]
        try:
            p1 = values.index(1)
            p9 = values.index(9)
        except ValueError:
            return  # 1 or 9 not placed yet in this line
        lo, hi = min(p1, p9), max(p1, p9)
        between = [(cells[i][0], cells[i][1]) for i in range(lo + 1, hi)]
        if not between:
            return
        empty_between = [(r, c) for r, c in between if self.board[r][c] == 0]
        if len(empty_between) == 1:
            r2, c2 = empty_between[0]
            filled = sum(self.board[r][c] for r, c in between if self.board[r][c] != 0)
            remaining = clue - filled
            if 1 <= remaining <= 9:
                self.grid[r2][c2] &= DIGIT_BIT[remaining]
            else:
                self.grid[r2][c2] = 0  # contradiction

    def _apply_little_killer(self, row: int, col: int, digit: int) -> None:
        """When the last unknown cell on a little-killer diagonal is filled, verify/fix."""
        for clue in self._cell_to_lk.get((row, col), []):
            cells = clue['cells']
            empty_cells = [(cell[0], cell[1]) for cell in cells
                           if self.board[cell[0]][cell[1]] == 0]
            if len(empty_cells) == 1:
                r2, c2 = empty_cells[0]
                filled = sum(self.board[cell[0]][cell[1]] for cell in cells
                             if self.board[cell[0]][cell[1]] != 0)
                remaining = clue['sum'] - filled
                if 1 <= remaining <= 9:
                    self.grid[r2][c2] &= DIGIT_BIT[remaining]
                else:
                    self.grid[r2][c2] = 0  # contradiction

    def eliminate(self, row: int, col: int, digit: int) -> bool:
        """
        Remove digit from candidates of (row, col).
        Returns True if the candidate was present (i.e., something changed).
        Does NOT propagate — callers do that explicitly.
        """
        bit = DIGIT_BIT[digit]
        if self.grid[row][col] & bit:
            self.grid[row][col] &= ~bit
            return True
        return False

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    def candidates(self, row: int, col: int) -> list[int]:
        """Return list of candidate digits for cell (row, col)."""
        return _bits_to_digits(self.grid[row][col])

    def candidate_count(self, row: int, col: int) -> int:
        return _popcount(self.grid[row][col])

    def candidate_bits(self, row: int, col: int) -> int:
        """Raw bitset — useful for fast set operations in technique code."""
        return self.grid[row][col]

    def is_empty(self, row: int, col: int) -> bool:
        return self.board[row][col] == 0

    def is_solved(self) -> bool:
        return all(self.board[r][c] != 0 for r in range(9) for c in range(9))

    def has_contradiction(self) -> bool:
        """True if any empty cell has zero candidates — puzzle is broken."""
        return any(
            self.board[r][c] == 0 and self.grid[r][c] == 0
            for r in range(9) for c in range(9)
        )

    # ------------------------------------------------------------------
    # Houses
    # ------------------------------------------------------------------

    def get_houses(self) -> list[list[tuple[int, int]]]:
        """
        Return all constraint houses for this sudoku type.
        Result is cached after first call.

        For KILLER: cages are added as variable-size houses (no-repeat groups).
        For LITTLE_KILLER: clue lines are NOT houses (digits may repeat).
        Note: NON_CONSECUTIVE / ANTI_KNIGHT / ANTI_KING constraints are NOT
        house-based and are handled separately in _apply_placement.
        """
        if self._houses is not None:
            return self._houses

        houses: list[list[tuple[int, int]]] = []

        # Rows
        for r in range(9):
            houses.append([(r, c) for c in range(9)])

        # Columns
        for c in range(9):
            houses.append([(r, c) for r in range(9)])

        # Standard 3×3 boxes
        for br in range(3):
            for bc in range(3):
                houses.append([
                    (br * 3 + dr, bc * 3 + dc)
                    for dr in range(3) for dc in range(3)
                ])

        if self.sudoku_type == 'DIAGONAL':
            houses.append([(i, i) for i in range(9)])       # ↘
            houses.append([(i, 8 - i) for i in range(9)])   # ↙

        elif self.sudoku_type == 'WINDOKU':
            for wr, wc in WINDOKU_WINDOWS:
                houses.append([
                    (wr + dr, wc + dc)
                    for dr in range(3) for dc in range(3)
                ])

        elif self.sudoku_type == 'KILLER' and self.killer_cages:
            # Each cage is a no-repeat group (variable size)
            for cage in self.killer_cages:
                houses.append([(cell[0], cell[1]) for cell in cage['cells']])

        self._houses = houses
        return houses

    def get_peers(self, row: int, col: int) -> set[tuple[int, int]]:
        """
        Return all cells that share a house with (row, col).
        Result is cached per cell.

        Note: for NON_CONSECUTIVE and ANTI_KNIGHT/ANTI_KING the extra
        constraints are NOT house-based (they don't constrain equality),
        so they are NOT included here. They are handled separately in
        _apply_placement and in technique solvers.
        """
        key = (row, col)
        if key in self._peer_cache:
            return self._peer_cache[key]

        peers: set[tuple[int, int]] = set()
        for house in self.get_houses():
            if key in house:
                peers.update(house)
        peers.discard(key)

        self._peer_cache[key] = peers
        return peers

    # ------------------------------------------------------------------
    # Debug / display
    # ------------------------------------------------------------------

    def __repr__(self) -> str:
        lines = []
        for r in range(9):
            row_parts = []
            for c in range(9):
                if self.board[r][c] != 0:
                    row_parts.append(f' {self.board[r][c]} ')
                else:
                    digits = self.candidates(r, c)
                    row_parts.append(f'[{"".join(map(str, digits))}]')
            lines.append('  '.join(row_parts))
        return '\n'.join(lines)
