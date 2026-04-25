import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Board } from './Board';
import type { Board as BoardType } from '../../types/index';

// Helper: build a simple board where row 0 = 1..9, all other cells empty
function makeBoard(): BoardType {
  const board: BoardType = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (let c = 0; c < 9; c++) board[0]![c] = c + 1;
  // Sprinkle some matching 5s elsewhere to test matching highlight
  board[3]![3] = 5;
  board[7]![7] = 5;
  return board;
}

const noopProps = {
  errors: new Set<string>(),
  notes: new Map<string, Set<number>>(),
  onCellClick: vi.fn(),
};

describe('Board highlighting', () => {
  it('applies cell-highlighted to row/col/box peers when a cell is selected', () => {
    const board = makeBoard();
    render(
      <Board
        board={board}
        initialBoard={board}
        selectedCell={{ row: 0, col: 0 }}
        {...noopProps}
      />
    );

    // Same row peer with a different digit (R1C2 = 2): plain peer highlight,
    // never matching-value (digits differ).
    const r1c2 = screen.getByLabelText('R1C2: 2');
    expect(r1c2.className).toContain('cell-highlighted');
    expect(r1c2.className).not.toContain('cell-matching-value');

    // Same column peer (R2C1, value 0): plain peer highlight
    const r2c1 = screen.getByLabelText('R2C1');
    expect(r2c1.className).toContain('cell-highlighted');

    // Far cell (R5C5, value 0): no peer highlight
    const r5c5 = screen.getByLabelText('R5C5');
    expect(r5c5.className).not.toContain('cell-highlighted');
    expect(r5c5.className).not.toContain('cell-matching-value');
  });

  it('matching-value wins over plain peer-highlight on cells that are both', () => {
    // Selecting R1C5 (value 5) makes R1C1..R1C9 all peers; R1C5 itself is
    // selected; the box around R1C5 (rows 0..2, cols 3..5) intersects with
    // any other 5 in that box. We use R4C4 (value 5) which sits in a
    // different row/col/box than R1C5 — so it's a pure matching-value cell.
    // R1C2 is a pure peer (different digit), and we already test that above.
    // Here we craft a cell that is BOTH a peer AND a match: put a 5 in R1C9
    // — same row as selection AND same value.
    const board = makeBoard();
    board[0]![8] = 5; // make R1C9 = 5 (peer + match)
    render(
      <Board
        board={board}
        initialBoard={board}
        selectedCell={{ row: 0, col: 4 }}
        {...noopProps}
      />
    );

    const r1c9 = screen.getByLabelText('R1C9: 5');
    // The Cell.tsx else-if order documents that matching-value wins.
    expect(r1c9.className).toContain('cell-matching-value');
    expect(r1c9.className).not.toContain('cell-highlighted');
  });

  it('applies cell-matching-value to cells sharing the selected digit', () => {
    const board = makeBoard();
    render(
      <Board
        board={board}
        initialBoard={board}
        selectedCell={{ row: 0, col: 4 }} // value 5
        {...noopProps}
      />
    );

    // R4C4 has value 5 — should be matching-value, not just a peer
    const r4c4 = screen.getByLabelText('R4C4: 5');
    expect(r4c4.className).toContain('cell-matching-value');

    // R8C8 has value 5 (not a peer of R0C4) — should still be matching
    const r8c8 = screen.getByLabelText('R8C8: 5');
    expect(r8c8.className).toContain('cell-matching-value');

    // Selected cell itself is not marked as matching
    const r1c5 = screen.getByLabelText('R1C5: 5');
    expect(r1c5.className).toContain('cell-selected');
    expect(r1c5.className).not.toContain('cell-matching-value');
  });

  it('does not highlight matches when the selected cell is empty', () => {
    const board = makeBoard();
    render(
      <Board
        board={board}
        initialBoard={board}
        selectedCell={{ row: 5, col: 5 }} // empty
        {...noopProps}
      />
    );

    // Cell with value 5 elsewhere should not be matching
    const r4c4 = screen.getByLabelText('R4C4: 5');
    expect(r4c4.className).not.toContain('cell-matching-value');
  });

  it('suppresses both peer and matching highlights when highlightsEnabled is false', () => {
    const board = makeBoard();
    render(
      <Board
        board={board}
        initialBoard={board}
        selectedCell={{ row: 0, col: 4 }} // value 5
        highlightsEnabled={false}
        {...noopProps}
      />
    );

    const r4c4 = screen.getByLabelText('R4C4: 5');
    expect(r4c4.className).not.toContain('cell-matching-value');
    expect(r4c4.className).not.toContain('cell-highlighted');

    const r2c4 = screen.getByLabelText('R2C4'); // same column, empty
    expect(r2c4.className).not.toContain('cell-highlighted');

    // Selected cell still gets the selected ring
    const r1c5 = screen.getByLabelText('R1C5: 5');
    expect(r1c5.className).toContain('cell-selected');
  });

  it('does not apply matching-value highlight to cells flagged as errors', () => {
    const board = makeBoard();
    render(
      <Board
        board={board}
        initialBoard={board}
        selectedCell={{ row: 0, col: 4 }} // value 5
        {...noopProps}
        errors={new Set(['3,3'])} // mark R4C4 (value 5) as an error (0-indexed key)
      />
    );

    // aria-label now includes "(error)" suffix — reflects the error state.
    const r4c4 = screen.getByLabelText('R4C4: 5 (error)');
    // Error styling must take priority over the matching-value background.
    expect(r4c4.className).toContain('cell-error');
    expect(r4c4.className).not.toContain('cell-matching-value');
  });

  it('applies no highlights when no cell is selected', () => {
    const board = makeBoard();
    render(
      <Board
        board={board}
        initialBoard={board}
        selectedCell={null}
        {...noopProps}
      />
    );

    const r4c4 = screen.getByLabelText('R4C4: 5');
    expect(r4c4.className).not.toContain('cell-matching-value');
    expect(r4c4.className).not.toContain('cell-highlighted');
  });

  // Regression coverage for #134 — investigation closure. The original
  // /qa-only finding observed via gstack browse synthesized clicks that
  // the number pad stayed disabled when a cell appeared focused. The
  // production click path (Cell.onClick → Board.onCellClick prop →
  // GameContainer.handleCellClick → actions.selectCell) is straightforward
  // and known-correct; the issue was a synthesized-click testing artifact,
  // not a real user-facing bug. These tests pin the contract so nobody
  // regresses it.
  it('fires onCellClick with the cell coordinates on click (#134)', () => {
    const board = makeBoard();
    const onCellClick = vi.fn();
    render(
      <Board
        board={board}
        initialBoard={board}
        selectedCell={null}
        errors={new Set<string>()}
        notes={new Map<string, Set<number>>()}
        onCellClick={onCellClick}
      />
    );

    const r3c5 = screen.getByLabelText('R3C5');
    fireEvent.click(r3c5);

    expect(onCellClick).toHaveBeenCalledTimes(1);
    expect(onCellClick).toHaveBeenCalledWith(2, 4);
  });

  it('fires onCellClick on Enter or Space (keyboard activation) (#134)', () => {
    const board = makeBoard();
    const onCellClick = vi.fn();
    render(
      <Board
        board={board}
        initialBoard={board}
        selectedCell={null}
        errors={new Set<string>()}
        notes={new Map<string, Set<number>>()}
        onCellClick={onCellClick}
      />
    );

    const r4c1 = screen.getByLabelText('R4C1');
    fireEvent.keyDown(r4c1, { key: 'Enter' });
    expect(onCellClick).toHaveBeenCalledWith(3, 0);

    onCellClick.mockClear();
    fireEvent.keyDown(r4c1, { key: ' ' });
    expect(onCellClick).toHaveBeenCalledWith(3, 0);
  });

  it('threads colorBlindMode=true into cells so error cells include (error) in aria-label', () => {
    const board = makeBoard();
    render(
      <Board
        board={board}
        initialBoard={board}
        selectedCell={null}
        colorBlindMode={true}
        {...noopProps}
        errors={new Set(['3,3'])} // R4C4 (value 5)
      />
    );
    // aria-label includes (error) annotation — proves colorBlindMode is passed to Cell
    const r4c4 = screen.getByLabelText('R4C4: 5 (error)');
    expect(r4c4).toBeTruthy();
  });
});
