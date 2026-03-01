import { memo } from 'react';
import { EMPTY_CELL } from '../../utils/constants';

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
  onClick,
}) {
  const baseStyles = 'w-full h-full flex items-center justify-center text-xl font-medium cursor-pointer select-none transition-colors relative';

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
  } else if (isHighlighted) {
    cellStyles += ' cell-highlighted';
  }

  // Border styles for 3x3 boxes
  const borderStyles = [];
  if (row % 3 === 0 && row !== 0) borderStyles.push('border-t-2 border-t-gray-800');
  if (col % 3 === 0 && col !== 0) borderStyles.push('border-l-2 border-l-gray-800');
  if (row === 0) borderStyles.push('border-t-2 border-t-gray-800');
  if (col === 0) borderStyles.push('border-l-2 border-l-gray-800');
  if (row === 8) borderStyles.push('border-b-2 border-b-gray-800');
  if (col === 8) borderStyles.push('border-r-2 border-r-gray-800');

  // Light borders between cells
  if (!borderStyles.some(s => s.includes('border-t'))) borderStyles.push('border-t border-gray-400');
  if (!borderStyles.some(s => s.includes('border-l'))) borderStyles.push('border-l border-gray-400');
  if (!borderStyles.some(s => s.includes('border-b'))) borderStyles.push('border-b border-gray-400');
  if (!borderStyles.some(s => s.includes('border-r'))) borderStyles.push('border-r border-gray-400');

  return (
    <div
      className={`${baseStyles} ${cellStyles} ${borderStyles.join(' ')}`}
      onClick={() => onClick(row, col)}
      role="button"
      tabIndex={0}
      aria-label={`Cell row ${row + 1} column ${col + 1}`}
    >
      {/* Thermo: tube segments and bulb/center circle, rendered behind everything */}
      {thermoCell && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
          {thermoCell.dirs.includes('top') && (
            <div className="absolute bg-gray-300"
                 style={{ left: '50%', transform: 'translateX(-50%)', top: 0, height: '50%', width: '14px' }} />
          )}
          {thermoCell.dirs.includes('bottom') && (
            <div className="absolute bg-gray-300"
                 style={{ left: '50%', transform: 'translateX(-50%)', top: '50%', height: '50%', width: '14px' }} />
          )}
          {thermoCell.dirs.includes('left') && (
            <div className="absolute bg-gray-300"
                 style={{ top: '50%', transform: 'translateY(-50%)', left: 0, width: '50%', height: '14px' }} />
          )}
          {thermoCell.dirs.includes('right') && (
            <div className="absolute bg-gray-300"
                 style={{ top: '50%', transform: 'translateY(-50%)', left: '50%', width: '50%', height: '14px' }} />
          )}
          {/* Bulb (large circle) or junction smoother (tube-width circle) */}
          <div className="absolute bg-gray-300 rounded-full"
               style={{
                 width: thermoCell.isBulb ? '32px' : '14px',
                 height: thermoCell.isBulb ? '32px' : '14px',
                 top: '50%', left: '50%',
                 transform: 'translate(-50%, -50%)',
               }} />
        </div>
      )}

      {/* Killer Sudoku: dashed cage borders */}
      {cageTop    && <div className="absolute top-0 left-0 right-0 h-0 pointer-events-none z-20" style={{ borderTop:    '2px dashed #7c3aed' }} />}
      {cageRight  && <div className="absolute top-0 right-0 bottom-0 w-0 pointer-events-none z-20" style={{ borderRight:  '2px dashed #7c3aed' }} />}
      {cageBottom && <div className="absolute left-0 right-0 bottom-0 h-0 pointer-events-none z-20" style={{ borderBottom: '2px dashed #7c3aed' }} />}
      {cageLeft   && <div className="absolute top-0 left-0 bottom-0 w-0 pointer-events-none z-20" style={{ borderLeft:   '2px dashed #7c3aed' }} />}
      {/* Killer Sudoku: cage sum in top-left corner */}
      {cageSum !== null && (
        <span className="absolute top-0.5 left-0.5 z-20 pointer-events-none text-violet-700 font-bold leading-none select-none"
              style={{ fontSize: '9px' }}>
          {cageSum}
        </span>
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
          rightDot === 'white' ? 'bg-white border-gray-800' : 'bg-gray-900 border-gray-900'
        }`} />
      )}
      {/* Kropki: dot on bottom border */}
      {bottomDot && row < 8 && (
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 rounded-full z-10 pointer-events-none border-2 ${
          bottomDot === 'white' ? 'bg-white border-gray-800' : 'bg-gray-900 border-gray-900'
        }`} />
      )}

      {/* Greater Than: inequality sign on right border */}
      {rightSign && col < 8 && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 pointer-events-none flex items-center justify-center bg-white rounded-sm"
          style={{ fontSize: '9px', fontWeight: 'bold', color: '#4338ca', width: '14px', height: '14px' }}
        >
          {rightSign === '>' ? '>' : '<'}
        </div>
      )}
      {/* Greater Than: inequality sign on bottom border */}
      {bottomSign && row < 8 && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10 pointer-events-none flex items-center justify-center bg-white rounded-sm"
          style={{ fontSize: '9px', fontWeight: 'bold', color: '#4338ca', width: '14px', height: '14px' }}
        >
          {bottomSign === '>' ? '∨' : '∧'}
        </div>
      )}

      {/* Odd/Even marker */}
      {oddEvenMarker && (
        <div className="absolute top-0.5 left-0.5 w-3 h-3">
          {oddEvenMarker === 'odd' ? (
            <div className="w-full h-full rounded-full bg-blue-400 border border-blue-600" title="Odd" />
          ) : (
            <div className="w-full h-full bg-orange-400 border border-orange-600" title="Even" />
          )}
        </div>
      )}

      {value !== EMPTY_CELL ? (
        value
      ) : notes && notes.size > 0 ? (
        <div className="grid grid-cols-3 gap-0 w-full h-full p-1 text-xs text-gray-500">
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
    prevProps.notes === nextProps.notes
  );
});
