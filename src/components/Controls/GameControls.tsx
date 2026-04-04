import { useTranslation } from 'react-i18next';
import { Button } from '../UI/Button';
import { GAME_STATUS } from '../../utils/constants';
import type { GameStatus } from '../../types/index';

interface GameControlsProps {
  onNewGame: () => void;
  onCheck: () => void;
  onHint: () => void;
  onPause: () => void;
  onResume: () => void;
  onToggleNotes: () => void;
  hintsUsed: number;
  maxHints: number;
  gameStatus: GameStatus;
  notesMode: boolean;
}

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
}: GameControlsProps) {
  const { t } = useTranslation();
  const isPaused = gameStatus === GAME_STATUS.PAUSED;
  const isPlaying = gameStatus === GAME_STATUS.PLAYING;
  const isCompleted = gameStatus === GAME_STATUS.COMPLETED;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={onNewGame} variant="primary">
          {t('game.newGame')}
        </Button>

        {isPlaying && (
          <>
            <Button onClick={onCheck} variant="secondary">
              {t('game.check')}
            </Button>

            <Button
              onClick={onHint}
              variant="secondary"
              disabled={hintsUsed >= maxHints}
            >
              {t('game.hint')} ({t('game.hintsUsed', { used: hintsUsed, max: maxHints })})
            </Button>

            <Button
              onClick={onToggleNotes}
              variant={notesMode ? 'primary' : 'secondary'}
            >
              {notesMode ? '✓ ' : ''}{t('game.notes')}
            </Button>
          </>
        )}

        {isPlaying && (
          <Button onClick={onPause} variant="secondary">
            {t('game.pause')}
          </Button>
        )}

        {isPaused && (
          <Button onClick={onResume} variant="success">
            {t('game.resume')}
          </Button>
        )}
      </div>

      {isCompleted && (
        <div className="bg-green-100 border-2 border-green-600 rounded-lg p-4 text-center">
          <p className="text-xl font-bold text-green-800">
            {t('game.completed')}
          </p>
        </div>
      )}
    </div>
  );
}
