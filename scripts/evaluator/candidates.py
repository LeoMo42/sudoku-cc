"""
CandidateGrid — bitset-based candidate tracker for Sudoku variants.

Representation:
    grid[r][c] is a 9-bit integer.
    Bit i (0-indexed) being set means digit (i+1) is a candidate.
    Example: 0b000000101 = digits 1 and 3 are possible.

    ALL_CANDIDATES = 0b111111111 = 511
    Filled cell:    grid[r][c] = 0
"""

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


class CandidateGrid:
    """
    Tracks candidates for all cells with O(1) bit operations.

    Supports sudoku types:
        CLASSIC, DIAGONAL, WINDOKU, ANTI_KNIGHT, ANTI_KING,
        NON_CONSECUTIVE, ODD_EVEN

    Parameters
    ----------
    board : list[list[int]]
        9×9 board, 0 = empty cell.
    sudoku_type : str
        One of the type IDs above.
    odd_even_mask : list[list[str]] | None
        Required for ODD_EVEN type. Each cell is 'odd', 'even', or None.
    """

    def __init__(
        self,
        board: list[list[int]],
        sudoku_type: str = 'CLASSIC',
        odd_even_mask: list[list[str]] | None = None,
    ):
        self.sudoku_type = sudoku_type
        self.odd_even_mask = odd_even_mask
        self.board = [row[:] for row in board]
        self.grid = [[0] * 9 for _ in range(9)]

        # Precompute houses once — used heavily by technique solvers
        self._houses: list[list[tuple[int, int]]] | None = None
        # Precompute peer sets once
        self._peer_cache: dict[tuple[int, int], set[tuple[int, int]]] = {}

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

        # 2. ODD_EVEN type: restrict by cell parity before anything else
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

        # 3. Eliminate based on every filled digit
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
            # Orthogonal neighbors cannot have digit±1
            lo_bit = DIGIT_BIT[digit - 1] if digit > 1 else 0
            hi_bit = DIGIT_BIT[digit + 1] if digit < 9 else 0
            mask = lo_bit | hi_bit
            for dr, dc in ORTHOGONALS:
                r, c = row + dr, col + dc
                if 0 <= r < 9 and 0 <= c < 9:
                    self.grid[r][c] &= ~mask

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
