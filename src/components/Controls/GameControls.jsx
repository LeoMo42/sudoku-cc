import { Button } from '../UI/Button';
import { DIFFICULTY_LEVELS, GAME_STATUS } from '../../utils/constants';

/**
 * Game control buttons
 */
export function GameControls({
  onNewGame,
  onCheck,
  onHint,
  onPause,
  onResume,
  onToggleNotes,
  hintsUsed,
  maxHints,
  gameStatus,
  notesMode,
}) {
  const isPaused = gameStatus === GAME_STATUS.PAUSED;
  const isPlaying = gameStatus === GAME_STATUS.PLAYING;
  const isCompleted = gameStatus === GAME_STATUS.COMPLETED;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={onNewGame} variant="primary">
          Новая игра
        </Button>

        {isPlaying && (
          <>
            <Button onClick={onCheck} variant="secondary">
              Проверить
            </Button>

            <Button
              onClick={onHint}
              variant="secondary"
              disabled={hintsUsed >= maxHints}
            >
              Подсказка ({hintsUsed}/{maxHints})
            </Button>

            <Button
              onClick={onToggleNotes}
              variant={notesMode ? 'primary' : 'secondary'}
            >
              {notesMode ? '✓ ' : ''}Заметки
            </Button>
          </>
        )}

        {isPlaying && (
          <Button onClick={onPause} variant="secondary">
            Пауза
          </Button>
        )}

        {isPaused && (
          <Button onClick={onResume} variant="success">
            Продолжить
          </Button>
        )}
      </div>

      {isCompleted && (
        <div className="bg-green-100 border-2 border-green-600 rounded-lg p-4 text-center">
          <p className="text-xl font-bold text-green-800">
            🎉 Поздравляем! Вы решили головоломку!
          </p>
        </div>
      )}
    </div>
  );
}
