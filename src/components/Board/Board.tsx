import { useMemo } from 'react';
import { Cell } from './Cell';
import { GRID_SIZE, EMPTY_CELL, WINDOKU_WINDOWS } from '../../utils/constants';
import type {
  Board as BoardType,
  CellPosition,
  SudokuTypeId,
  OddEvenMarkers,
  KropkiDots,
  KillerCage,
  GreaterThanSigns,
  Thermo,
  SandwichClues,
  HighlightRole,
} from '../../types/index';

/**
 * Sudoku board component (9x9 grid)
 */
const LITTLE_KILLER_ARROW: Record<string, string> = { '1,1': '↘', '1,-1': '↙', '-1,1': '↗', '-1,-1': '↖' };

// Extended LittleKillerClue with display properties computed by the generator
interface LittleKillerClueDisplay {
  sum: number;
  labelRow: number;
  labelCol: number;
  dr: number;
  dc: number;
}

interface BoardProps {
  board: BoardType;
  initialBoard: BoardType;
  selectedCell: CellPosition | null;
  errors: Set<string>;
  notes: Map<string, Set<number>>;
  sudokuType?: SudokuTypeId;
  oddEvenMarkers?: OddEvenMarkers | null;
  kropkiDots?: KropkiDots | null;
  killerCages?: KillerCage[] | null;
  littleKillerClues?: LittleKillerClueDisplay[] | null;
  greaterThanSigns?: GreaterThanSigns | null;
  thermos?: Thermo[] | null;
  sandwichClues?: SandwichClues | null;
  hintHighlights?: Map<string, HighlightRole> | null;
  onCellClick: (row: number, col: number) => void;
}

export function Board({
  board,
  initialBoard,
  selectedCell,
  errors,
  notes,
  sudokuType = 'CLASSIC',
  oddEvenMarkers = null,
  kropkiDots = null,
  killerCages = null,
  littleKillerClues = null,
  greaterThanSigns = null,
  thermos = null,
  sandwichClues = null,
  hintHighlights = null,
  onCellClick,
}: BoardProps) {
  // Build lookup maps for Killer Sudoku cage borders and sums
  const cellToCageMap = new Map<string, KillerCage & { id: number }>();
  const cageTopLeftSet = new Set<string>();
  if (killerCages) {
    for (let idx = 0; idx < killerCages.length; idx++) {
      const cage = killerCages[idx]!;
      const cageWithId = { ...cage, id: idx };
      for (const { row, col } of cage.cells) cellToCageMap.set(`${row},${col}`, cageWithId);
      const tl = cage.cells.reduce((a, b) =>
        b.row < a.row || (b.row === a.row && b.col < a.col) ? b : a
      );
      cageTopLeftSet.add(`${tl.row},${tl.col}`);
    }
  }

  // Build thermo data map: "row,col" -> { isBulb, dirs[] }
  // Memoized so Cell references stay stable between renders (memo comparator uses ===)
  const thermoDataMap = useMemo(() => {
    const map = new Map<string, { isBulb: boolean; dirs: string[] }>();
    if (!thermos) return map;
    for (const thermo of thermos) {
      for (let i = 0; i < thermo.length; i++) {
        const { row, col } = thermo[i]!;
        const prev = i > 0 ? thermo[i - 1]! : null;
        const next = i < thermo.length - 1 ? thermo[i + 1]! : null;
        const dirs: string[] = [];
        for (const neighbor of [prev, next]) {
          if (!neighbor) continue;
          if (neighbor.row < row) dirs.push('top');
          else if (neighbor.row > row) dirs.push('bottom');
          else if (neighbor.col < col) dirs.push('left');
          else dirs.push('right');
        }
        map.set(`${row},${col}`, { isBulb: i === 0, dirs });
      }
    }
    return map;
  }, [thermos]);

  const cellGrid = board.map((row, rowIndex) =>
    row.map((value, colIndex) => {
            const isInitial = initialBoard[rowIndex]![colIndex] !== EMPTY_CELL;
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

            // Anti-Knight: highlight cells a knight's move from selected cell
            const isKnightTarget =
              sudokuType === 'ANTI_KNIGHT' &&
              selectedCell &&
              !isSelected &&
              (() => {
                const dr = Math.abs(rowIndex - selectedCell.row);
                const dc = Math.abs(colIndex - selectedCell.col);
                return (dr === 1 && dc === 2) || (dr === 2 && dc === 1);
              })();

            // Anti-King: highlight diagonal neighbours of selected cell
            const isKingDiagonal =
              sudokuType === 'ANTI_KING' &&
              selectedCell &&
              !isSelected &&
              Math.abs(rowIndex - selectedCell.row) === 1 &&
              Math.abs(colIndex - selectedCell.col) === 1;

            // Non-Consecutive: flag for static border dot markers
            const isNonConsec = sudokuType === 'NON_CONSECUTIVE';

            // Get odd/even marker for this cell
            const oddEvenMarker = oddEvenMarkers?.get(`${rowIndex},${colIndex}`) || null;

            // Get Kropki dots for this cell
            const rightDot = kropkiDots?.get(`${rowIndex},${colIndex},r`) || null;
            const bottomDot = kropkiDots?.get(`${rowIndex},${colIndex},b`) || null;

            // Get Greater Than signs for this cell
            const rightSign = greaterThanSigns?.get(`${rowIndex},${colIndex},r`) || null;
            const bottomSign = greaterThanSigns?.get(`${rowIndex},${colIndex},b`) || null;

            // Get thermo data for this cell
            const thermoCell = thermoDataMap.get(`${rowIndex},${colIndex}`) || null;

            // Get Killer cage info for this cell
            const cage = cellToCageMap.get(`${rowIndex},${colIndex}`);
            const cageId = cage?.id ?? null;
            const cageSum = (cageId !== null && cageTopLeftSet.has(`${rowIndex},${colIndex}`)) ? cage!.sum : null;
            const cageTop    = cageId !== null && (rowIndex === 0 || (cellToCageMap.get(`${rowIndex-1},${colIndex}`)?.id ?? null) !== cageId);
            const cageRight  = cageId !== null && (colIndex === 8 || (cellToCageMap.get(`${rowIndex},${colIndex+1}`)?.id ?? null) !== cageId);
            const cageBottom = cageId !== null && (rowIndex === 8 || (cellToCageMap.get(`${rowIndex+1},${colIndex}`)?.id ?? null) !== cageId);
            const cageLeft   = cageId !== null && (colIndex === 0 || (cellToCageMap.get(`${rowIndex},${colIndex-1}`)?.id ?? null) !== cageId);

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
                isKnightTarget={isKnightTarget}
                isKingDiagonal={isKingDiagonal}
                isNonConsec={isNonConsec}
                oddEvenMarker={oddEvenMarker}
                rightDot={rightDot}
                bottomDot={bottomDot}
                rightSign={rightSign}
                bottomSign={bottomSign}
                thermoCell={thermoCell}
                cageSum={cageSum}
                cageTop={cageTop}
                cageRight={cageRight}
                cageBottom={cageBottom}
                cageLeft={cageLeft}
                notes={cellNotes}
                hintRole={hintHighlights?.get(`${rowIndex},${colIndex}`) ?? null}
                onClick={onCellClick}
              />
            );
          })
  );

  const innerBoard = (
    <div className="inline-block bg-gray-800 p-2 rounded-lg shadow-2xl">
      <div
        className="grid grid-cols-9 grid-rows-9 gap-0 bg-white relative"
        style={{ width: '450px', height: '450px' }}
        role="grid"
        aria-label="Sudoku board"
      >
        {cellGrid}
      </div>
    </div>
  );

  // Little Killer: wrap with a container that shows diagonal sum clues outside the grid
  if (sudokuType === 'LITTLE_KILLER' && littleKillerClues && littleKillerClues.length > 0) {
    // Cell size = 50px, board padding (p-2) = 8px, label area = 35px
    const CELL_PX = 50;
    const BOARD_PAD = 8;
    const LABEL_AREA = 35;
    // Pixel offset from outer container top-left to the center of grid cell (0,0)
    const OFFSET = LABEL_AREA + BOARD_PAD + CELL_PX / 2; // 68

    return (
      <div className="relative" style={{ width: '536px', height: '536px' }}>
        <div className="absolute" style={{ left: `${LABEL_AREA}px`, top: `${LABEL_AREA}px` }}>
          {innerBoard}
        </div>
        {littleKillerClues.map((clue, i) => {
          const left = OFFSET + clue.labelCol * CELL_PX;
          const top  = OFFSET + clue.labelRow * CELL_PX;
          const arrow = LITTLE_KILLER_ARROW[`${clue.dr},${clue.dc}`];
          return (
            <div
              key={i}
              className="absolute flex flex-col items-center justify-center pointer-events-none"
              style={{ left: `${left}px`, top: `${top}px`, transform: 'translate(-50%, -50%)', width: '30px' }}
            >
              <span className="text-[11px] font-bold text-indigo-700 leading-tight">{arrow}</span>
              <span className="text-[10px] font-bold text-gray-800 leading-tight">{clue.sum}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Sandwich: wrap with a container that shows row/col sum clues outside the grid
  if (sudokuType === 'SANDWICH' && sandwichClues) {
    // Cell size = 50px, board padding (p-2) = 8px, label area = 40px
    const CELL_PX = 50;
    const BOARD_PAD = 8;
    const LABEL_AREA = 40;
    // Pixel offset from outer container top-left to the center of grid cell (0,0)
    const OFFSET = LABEL_AREA + BOARD_PAD + CELL_PX / 2; // 73

    return (
      <div className="relative" style={{ width: '506px', height: '506px' }}>
        <div className="absolute" style={{ left: `${LABEL_AREA}px`, top: `${LABEL_AREA}px` }}>
          {innerBoard}
        </div>
        {/* Column clues (above grid) */}
        {sandwichClues.cols.map((sum, c) => (
          <div
            key={`col-${c}`}
            className="absolute flex items-center justify-center pointer-events-none"
            style={{ left: `${OFFSET + c * CELL_PX}px`, top: '20px', transform: 'translate(-50%, -50%)' }}
          >
            <span className="text-xs font-bold text-blue-800">{sum}</span>
          </div>
        ))}
        {/* Row clues (left of grid) */}
        {sandwichClues.rows.map((sum, r) => (
          <div
            key={`row-${r}`}
            className="absolute flex items-center justify-center pointer-events-none"
            style={{ top: `${OFFSET + r * CELL_PX}px`, left: '20px', transform: 'translate(-50%, -50%)' }}
          >
            <span className="text-xs font-bold text-blue-800">{sum}</span>
          </div>
        ))}
      </div>
    );
  }

  return innerBoard;
}
