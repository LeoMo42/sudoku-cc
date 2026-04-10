import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

    // Same row peer (R1C2): should be highlighted (or matching, since both apply)
    const r1c2 = screen.getByLabelText('R1C2: 2');
    expect(
      r1c2.className.includes('cell-highlighted') ||
        r1c2.className.includes('cell-matching-value')
    ).toBe(true);

    // Same column peer (R2C1, value 0): plain peer highlight
    const r2c1 = screen.getByLabelText('R2C1');
    expect(r2c1.className).toContain('cell-highlighted');

    // Far cell (R5C5, value 0): no peer highlight
    const r5c5 = screen.getByLabelText('R5C5');
    expect(r5c5.className).not.toContain('cell-highlighted');
    expect(r5c5.className).not.toContain('cell-matching-value');
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
});
