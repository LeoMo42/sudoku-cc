import { useTranslation } from 'react-i18next';

/**
 * Legend for Odd-Even Sudoku markers
 */
export function OddEvenLegend() {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-md p-3 mt-3">
      <div className="flex items-center justify-center gap-6 text-sm">
        {/* Odd marker */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-400 border border-blue-600" />
          <span className="text-gray-700 font-medium">
            {t('oddEven.odd', 'Нечетные')}: 1, 3, 5, 7, 9
          </span>
        </div>

        {/* Even marker */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-400 border border-orange-600" />
          <span className="text-gray-700 font-medium">
            {t('oddEven.even', 'Четные')}: 2, 4, 6, 8
          </span>
        </div>
      </div>
    </div>
  );
}
