import { useTranslation } from 'react-i18next';
import { DIFFICULTY_LEVELS } from '../../utils/constants';
import type { DifficultyLevel } from '../../types/index';

interface DifficultySelectorProps {
  currentDifficulty: DifficultyLevel;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  disabled: boolean;
}

/**
 * Difficulty level selector
 */
export function DifficultySelector({ currentDifficulty, onDifficultyChange, disabled }: DifficultySelectorProps) {
  const { t } = useTranslation();
  const difficulties = Object.keys(DIFFICULTY_LEVELS) as DifficultyLevel[];

  return (
    <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label={t('game.difficulty')}>
      {difficulties.map((level) => (
        <button
          key={level}
          onClick={() => onDifficultyChange(level)}
          disabled={disabled}
          role="radio"
          aria-checked={currentDifficulty === level}
          className={`px-4 py-2 min-h-[44px] rounded-lg font-medium transition-colors ${
            currentDifficulty === level
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {t(`difficulty.${level}`)}
        </button>
      ))}
    </div>
  );
}
