import { DIFFICULTY_LEVELS } from '../../utils/constants';

/**
 * Difficulty level selector
 */
export function DifficultySelector({ currentDifficulty, onDifficultyChange, disabled }) {
  const difficulties = Object.keys(DIFFICULTY_LEVELS);

  return (
    <div className="flex gap-2 flex-wrap">
      {difficulties.map((level) => (
        <button
          key={level}
          onClick={() => onDifficultyChange(level)}
          disabled={disabled}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentDifficulty === level
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {DIFFICULTY_LEVELS[level].name}
        </button>
      ))}
    </div>
  );
}
