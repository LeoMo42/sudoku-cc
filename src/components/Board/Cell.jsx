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
  oddEvenMarker,
  notes,
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

  if (isSelected) {
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
    prevProps.oddEvenMarker === nextProps.oddEvenMarker &&
    prevProps.notes === nextProps.notes
  );
});
