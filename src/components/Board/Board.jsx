import { Cell } from './Cell';
import { GRID_SIZE, EMPTY_CELL } from '../../utils/constants';

/**
 * Sudoku board component (9x9 grid)
 */
export function Board({
  board,
  initialBoard,
  selectedCell,
  errors,
  notes,
  onCellClick,
}) {
  return (
    <div className="inline-block bg-gray-800 p-2 rounded-lg shadow-2xl">
      <div
        className="grid grid-cols-9 gap-0 bg-white"
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
