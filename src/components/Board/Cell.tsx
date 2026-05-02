import { memo } from 'react';
import { EMPTY_CELL } from '../../utils/constants';
import type { CellValue, HighlightRole, KropkiDotType, GreaterThanSign, Parity } from '../../types/index';

function setsEqual(a: Set<number> | undefined, b: Set<number> | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

interface ThermoCell {
  isBulb: boolean;
  dirs: string[];
}

interface CellProps {
  value: CellValue;
  row: number;
  col: number;
  isInitial: boolean;
  isSelected: boolean | null | undefined;
  isHighlighted: boolean | null | undefined;
  isMatchingValue?: boolean;
  isError: boolean;
  isOnDiagonal: boolean;
  isInWindow: boolean;
  isKnightTarget: boolean | null | undefined;
  isKingDiagonal: boolean | null | undefined;
  isNonConsec: boolean;
  oddEvenMarker: Parity | null | undefined;
  rightDot: KropkiDotType | null | undefined;
  bottomDot: KropkiDotType | null | undefined;
  rightSign?: GreaterThanSign | null;
  bottomSign?: GreaterThanSign | null;
  thermoCell?: ThermoCell | null;
  cageSum?: number | null;
  cageTop?: boolean;
  cageRight?: boolean;
  cageBottom?: boolean;
  cageLeft?: boolean;
  notes: Set<number> | undefined;
  hintRole?: HighlightRole | null;
  colorBlindMode?: boolean;
  onClick: (row: number, col: number) => void;
}

/**
 * Individual cell component (memoized for performance)
 */
export const Cell = memo(function Cell({
  value,
  row,
  col,
  isInitial,
  isSelected,
  isHighlighted,
  isMatchingValue = false,
  isError,
  isOnDiagonal,
  isInWindow,
  isKnightTarget,
  isKingDiagonal,
  isNonConsec,
  oddEvenMarker,
  rightDot,
  bottomDot,
  rightSign = null,
  bottomSign = null,
  thermoCell = null,
  cageSum = null,
  cageTop = false,
  cageRight = false,
  cageBottom = false,
  cageLeft = false,
  notes,
  hintRole = null,
  colorBlindMode = false,
  onClick,
}: CellProps) {
  // font-mono (#125): cell digits use JetBrains Mono for tabular widths
  // (so 1 occupies the same space as 8) and for the typographic character
  // sudoku boards deserve. Falls back to the default mono stack on slow
  // first-paint.
  const baseStyles = 'w-full h-full flex items-center justify-center text-xl font-mono font-medium cursor-pointer select-none transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset';

  let cellStyles = '';
  if (isError) {
    cellStyles = 'cell-error';
  } else if (isInitial) {
    cellStyles = 'cell-initial';
  } else {
    cellStyles = 'cell-user';
  }

  // Add diagonal highlight background
  if (isOnDiagonal && !isError) {
    cellStyles += ' cell-diagonal';
  }

  // Add window highlight background
  if (isInWindow && !isError) {
    cellStyles += ' cell-window';
  }

  if (isKnightTarget && !isError) {
    cellStyles += ' cell-knight-target';
  }
  if (isKingDiagonal && !isError) {
    cellStyles += ' cell-king-diagonal';
  }

  if (hintRole && !isError) {
    if (hintRole === 'target')    cellStyles += ' cell-hint-target';
    else if (hintRole === 'cause') cellStyles += ' cell-hint-cause';
    else if (hintRole === 'eliminate') cellStyles += ' cell-hint-eliminate';
  } else if (isSelected) {
    cellStyles += ' cell-selected';
  } else if (isMatchingValue && !isError) {
    // Matching-value highlight wins over plain peer highlight,
    // since a peer that also matches is the more informative state.
    // The `!isError` guard is defense-in-depth: Board already excludes
    // errors from isMatchingValue, but keeping the check here mirrors the
    // hint-role pattern above and protects direct callers (e.g. stories).
    cellStyles += ' cell-matching-value';
  } else if (isHighlighted) {
    cellStyles += ' cell-highlighted';
  }

  // Border styles for 3x3 boxes
  const borderStyles: string[] = [];
  if (row % 3 === 0 && row !== 0) borderStyles.push('border-t-2 border-t-gray-800 dark:border-t-gray-400');
  if (col % 3 === 0 && col !== 0) borderStyles.push('border-l-2 border-l-gray-800 dark:border-l-gray-400');
  if (row === 0) borderStyles.push('border-t-2 border-t-gray-800 dark:border-t-gray-400');
  if (col === 0) borderStyles.push('border-l-2 border-l-gray-800 dark:border-l-gray-400');
  if (row === 8) borderStyles.push('border-b-2 border-b-gray-800 dark:border-b-gray-400');
  if (col === 8) borderStyles.push('border-r-2 border-r-gray-800 dark:border-r-gray-400');

  // Light borders between cells
  if (!borderStyles.some(s => s.includes('border-t'))) borderStyles.push('border-t border-gray-400 dark:border-gray-600');
  if (!borderStyles.some(s => s.includes('border-l'))) borderStyles.push('border-l border-gray-400 dark:border-gray-600');
  if (!borderStyles.some(s => s.includes('border-b'))) borderStyles.push('border-b border-gray-400 dark:border-gray-600');
  if (!borderStyles.some(s => s.includes('border-r'))) borderStyles.push('border-r border-gray-400 dark:border-gray-600');

  return (
    <div
      className={`${baseStyles} ${cellStyles} ${borderStyles.join(' ')}`}
      onClick={() => onClick(row, col)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(row, col);
        }
      }}
      role="button"
      tabIndex={0}
      data-testid="cell"
      aria-label={`R${row + 1}C${col + 1}${value !== EMPTY_CELL ? `: ${value}` : ''}${isError ? ' (error)' : ''}`}
    >
      {/* Thermo: tube segments and bulb/center circle, rendered behind everything.
          Color-blind mode: blue instead of gray for better contrast. */}
      {thermoCell && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
          {thermoCell.dirs.includes('top') && (
            <div className={`absolute ${colorBlindMode ? 'bg-blue-400 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-500'}`}
                 style={{ left: '50%', transform: 'translateX(-50%)', top: 0, height: '50%', width: '14px' }} />
          )}
          {thermoCell.dirs.includes('bottom') && (
            <div className={`absolute ${colorBlindMode ? 'bg-blue-400 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-500'}`}
                 style={{ left: '50%', transform: 'translateX(-50%)', top: '50%', height: '50%', width: '14px' }} />
          )}
          {thermoCell.dirs.includes('left') && (
            <div className={`absolute ${colorBlindMode ? 'bg-blue-400 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-500'}`}
                 style={{ top: '50%', transform: 'translateY(-50%)', left: 0, width: '50%', height: '14px' }} />
          )}
          {thermoCell.dirs.includes('right') && (
            <div className={`absolute ${colorBlindMode ? 'bg-blue-400 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-500'}`}
                 style={{ top: '50%', transform: 'translateY(-50%)', left: '50%', width: '50%', height: '14px' }} />
          )}
          {/* Bulb (large circle) or junction smoother (tube-width circle) */}
          <div className={`absolute ${colorBlindMode ? 'bg-blue-400 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-500'} rounded-full`}
               style={{
                 width: thermoCell.isBulb ? '32px' : '14px',
                 height: thermoCell.isBulb ? '32px' : '14px',
                 top: '50%', left: '50%',
                 transform: 'translate(-50%, -50%)',
               }} />
        </div>
      )}

      {/* Killer Sudoku: cage borders. Color-blind mode: orange dotted (vs violet dashed)
          so cages are distinguishable by both color and pattern. */}
      {cageTop    && <div className={`absolute top-0 left-0 right-0 h-0 pointer-events-none z-20 border-t-2 ${colorBlindMode ? 'border-dotted border-orange-500' : 'border-dashed border-violet-600'}`} />}
      {cageRight  && <div className={`absolute top-0 right-0 bottom-0 w-0 pointer-events-none z-20 border-r-2 ${colorBlindMode ? 'border-dotted border-orange-500' : 'border-dashed border-violet-600'}`} />}
      {cageBottom && <div className={`absolute left-0 right-0 bottom-0 h-0 pointer-events-none z-20 border-b-2 ${colorBlindMode ? 'border-dotted border-orange-500' : 'border-dashed border-violet-600'}`} />}
      {cageLeft   && <div className={`absolute top-0 left-0 bottom-0 w-0 pointer-events-none z-20 border-l-2 ${colorBlindMode ? 'border-dotted border-orange-500' : 'border-dashed border-violet-600'}`} />}
      {/* Killer Sudoku: cage sum in top-left corner */}
      {cageSum !== null && (
        <span className={`absolute top-0.5 left-0.5 z-20 pointer-events-none font-bold leading-none select-none text-[9px] ${colorBlindMode ? 'text-orange-600 dark:text-orange-400' : 'text-violet-700 dark:text-violet-400'}`}>
          {cageSum}
        </span>
      )}

      {/* Color-blind mode: stripe pattern overlays for variant backgrounds.
          Each variant gets a unique stripe direction so they're distinguishable
          without relying on hue alone. */}
      {colorBlindMode && isOnDiagonal && !isError && (
        <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(147,51,234,0.2) 4px, rgba(147,51,234,0.2) 5px)' }} />
      )}
      {colorBlindMode && isInWindow && !isError && (
        <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(34,197,94,0.25) 4px, rgba(34,197,94,0.25) 5px)' }} />
      )}
      {colorBlindMode && isKnightTarget && !isError && (
        <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true"
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(245,158,11,0.25) 4px, rgba(245,158,11,0.25) 5px)' }} />
      )}
      {colorBlindMode && isKingDiagonal && !isError && (
        <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true"
          style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(20,184,166,0.25) 4px, rgba(20,184,166,0.25) 5px)' }} />
      )}

      {/* Color-blind mode: error badge (! icon) so errors are marked by shape + color */}
      {colorBlindMode && isError && (
        <span className="absolute top-0.5 right-0.5 z-30 pointer-events-none text-red-700 dark:text-red-300 font-black leading-none select-none text-[10px]" aria-hidden="true">!</span>
      )}

      {/* Non-Consecutive: dot on right border (except outer edge) */}
      {isNonConsec && col < 8 && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-400 opacity-70 z-10 pointer-events-none" />
      )}
      {/* Non-Consecutive: dot on bottom border (except outer edge) */}
      {isNonConsec && row < 8 && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-orange-400 opacity-70 z-10 pointer-events-none" />
      )}

      {/* Kropki: dot on right border */}
      {rightDot && col < 8 && (
        <div className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 rounded-full z-10 pointer-events-none border-2 ${
          rightDot === 'white' ? 'bg-white border-gray-800 dark:bg-gray-200 dark:border-gray-500' : 'bg-gray-900 border-gray-900 dark:bg-white dark:border-white'
        }`} />
      )}
      {/* Kropki: dot on bottom border */}
      {bottomDot && row < 8 && (
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 rounded-full z-10 pointer-events-none border-2 ${
          bottomDot === 'white' ? 'bg-white border-gray-800 dark:bg-gray-200 dark:border-gray-500' : 'bg-gray-900 border-gray-900 dark:bg-white dark:border-white'
        }`} />
      )}

      {/* Greater Than: inequality sign on right border */}
      {rightSign && col < 8 && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 pointer-events-none flex items-center justify-center bg-white dark:bg-gray-700 rounded-sm w-3.5 h-3.5 text-[9px] font-bold text-indigo-700 dark:text-indigo-300"
        >
          {rightSign === '>' ? '>' : '<'}
        </div>
      )}
      {/* Greater Than: inequality sign on bottom border */}
      {bottomSign && row < 8 && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10 pointer-events-none flex items-center justify-center bg-white dark:bg-gray-700 rounded-sm w-3.5 h-3.5 text-[9px] font-bold text-indigo-700 dark:text-indigo-300"
        >
          {bottomSign === '>' ? '∨' : '∧'}
        </div>
      )}

      {/* Odd/Even marker */}
      {oddEvenMarker && (
        <div className="absolute top-0.5 left-0.5 w-3 h-3">
          {oddEvenMarker === 'odd' ? (
            <div className="w-full h-full rounded-full bg-blue-400 border border-blue-600" />
          ) : (
            <div className="w-full h-full bg-orange-400 border border-orange-600" />
          )}
        </div>
      )}

      {value !== EMPTY_CELL ? (
        value
      ) : notes && notes.size > 0 ? (
        <div className="grid grid-cols-3 gap-0 w-full h-full p-1 text-xs text-gray-500 dark:text-gray-400">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <div
              key={num}
              className="flex items-center justify-center"
            >
              {notes.has(num) ? num : ''}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.value === nextProps.value &&
    prevProps.isInitial === nextProps.isInitial &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.isMatchingValue === nextProps.isMatchingValue &&
    prevProps.isError === nextProps.isError &&
    prevProps.isOnDiagonal === nextProps.isOnDiagonal &&
    prevProps.isInWindow === nextProps.isInWindow &&
    prevProps.isKnightTarget === nextProps.isKnightTarget &&
    prevProps.isKingDiagonal === nextProps.isKingDiagonal &&
    prevProps.isNonConsec === nextProps.isNonConsec &&
    prevProps.oddEvenMarker === nextProps.oddEvenMarker &&
    prevProps.rightDot === nextProps.rightDot &&
    prevProps.bottomDot === nextProps.bottomDot &&
    prevProps.rightSign === nextProps.rightSign &&
    prevProps.bottomSign === nextProps.bottomSign &&
    prevProps.thermoCell === nextProps.thermoCell &&
    prevProps.cageSum === nextProps.cageSum &&
    prevProps.cageTop === nextProps.cageTop &&
    prevProps.cageRight === nextProps.cageRight &&
    prevProps.cageBottom === nextProps.cageBottom &&
    prevProps.cageLeft === nextProps.cageLeft &&
    prevProps.hintRole === nextProps.hintRole &&
    prevProps.colorBlindMode === nextProps.colorBlindMode &&
    setsEqual(prevProps.notes, nextProps.notes)
  );
});
