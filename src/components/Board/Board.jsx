import { Cell } from './Cell';
import { GRID_SIZE, EMPTY_CELL, WINDOKU_WINDOWS } from '../../utils/constants';

/**
 * Sudoku board component (9x9 grid)
 */
export function Board({
  board,
  initialBoard,
  selectedCell,
  errors,
  notes,
  sudokuType = 'CLASSIC',
  oddEvenMarkers = null,
  onCellClick,
}) {
  return (
    <div className="inline-block bg-gray-800 p-2 rounded-lg shadow-2xl">
      <div
        className="grid grid-cols-9 grid-rows-9 gap-0 bg-white relative"
        style={{ width: '450px', height: '450px' }}
      >
        {board.map((row, rowIndex) =>
          row.map((value, colIndex) => {
            const isInitial = initialBoard[rowIndex][colIndex] !== EMPTY_CELL;
            const isSelected =
              selectedCell &&
              selectedCell.row === rowIndex &&
              selectedCell.col === colIndex;

            // Highlight cells in same row, column, or 3x3 box as selected cell
            const isHighlighted =
              selectedCell &&
              !isSelected &&
              (selectedCell.row === rowIndex ||
                selectedCell.col === colIndex ||
                (Math.floor(selectedCell.row / 3) === Math.floor(rowIndex / 3) &&
                  Math.floor(selectedCell.col / 3) === Math.floor(colIndex / 3)));

            const isError = errors.has(`${rowIndex},${colIndex}`);
            const cellNotes = notes.get(`${rowIndex},${colIndex}`);

            // Check if cell is on diagonal (for X-Sudoku)
            const isOnDiagonal = sudokuType === 'DIAGONAL' &&
              (rowIndex === colIndex || rowIndex + colIndex === GRID_SIZE - 1);

            // Check if cell is in a Windoku window
            const isInWindow = sudokuType === 'WINDOKU' &&
              WINDOKU_WINDOWS.some(
                (window) =>
                  rowIndex >= window.row &&
                  rowIndex < window.row + 3 &&
                  colIndex >= window.col &&
                  colIndex < window.col + 3
              );

            // Get odd/even marker for this cell
            const oddEvenMarker = oddEvenMarkers?.get(`${rowIndex},${colIndex}`) || null;

            return (
              <Cell
                key={`${rowIndex}-${colIndex}`}
                value={value}
                row={rowIndex}
                col={colIndex}
                isInitial={isInitial}
                isSelected={isSelected}
                isHighlighted={isHighlighted}
                isError={isError}
                isOnDiagonal={isOnDiagonal}
                isInWindow={isInWindow}
                oddEvenMarker={oddEvenMarker}
                notes={cellNotes}
                onClick={onCellClick}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
