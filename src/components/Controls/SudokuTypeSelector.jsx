import { useTranslation } from 'react-i18next';
import { SUDOKU_TYPES } from '../../utils/constants';

/**
 * Sudoku type selector component
 */
export function SudokuTypeSelector({ currentType, onTypeChange, disabled }) {
  const { t } = useTranslation();
  const types = Object.values(SUDOKU_TYPES);

  return (
    <div className="flex flex-col gap-2">
      {types.map((type) => (
        <button
          key={type.id}
          onClick={() => onTypeChange(type.id)}
          disabled={disabled}
          className={`
            px-4 py-3 rounded-lg font-medium transition-colors text-left
            ${
              currentType === type.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <div className="font-bold text-sm">
            {t(`sudokuTypes.${type.id}.name`)}
          </div>
          <div className="text-xs opacity-90 mt-1">
            {t(`sudokuTypes.${type.id}.description`)}
          </div>
        </button>
      ))}
    </div>
  );
}
