import { useTranslation } from 'react-i18next';
import { Button } from '../UI/Button';
import { GAME_STATUS } from '../../utils/constants';
import type { GameStatus } from '../../types/index';

interface GameControlsProps {
  onNewGame: () => void;
  onCheck: () => void;
  onHint: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPause: () => void;
  onResume: () => void;
  onToggleNotes: () => void;
  onShare: () => void;
  hintsUsed: number;
  maxHints: number;
  gameStatus: GameStatus;
  notesMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Game control buttons
 */
export function GameControls({
  onNewGame,
  onCheck,
  onHint,
  onUndo,
  onRedo,
  onPause,
  onResume,
  onToggleNotes,
  onShare,
  hintsUsed,
  maxHints,
  gameStatus,
  notesMode,
  canUndo,
  canRedo,
}: GameControlsProps) {
  const { t } = useTranslation();
  const isPaused = gameStatus === GAME_STATUS.PAUSED;
  const isPlaying = gameStatus === GAME_STATUS.PLAYING;
  const isCompleted = gameStatus === GAME_STATUS.COMPLETED;

  return (
    <div className="flex flex-col gap-3">
      {/*
        Two rows split by intent so the layout stays stable across
        locales (#131). When everything was a single flex-wrap row,
        Russian text widths pushed Undo to row 2 while English kept it
        on row 1 — muscle memory broke whenever the user switched
        language.

        Row 1 — primary actions (start / inspect / mark)
        Row 2 — transient controls (history + pause/resume timer)
      */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={onNewGame} variant="primary" data-testid="new-game-button">
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
      </div>

      {(isPlaying || isPaused) && (
        <div className="flex gap-2 flex-wrap">
          {isPlaying && (
            <>
              <Button onClick={onUndo} variant="secondary" disabled={!canUndo}>
                {t('game.undo')}
              </Button>

              <Button onClick={onRedo} variant="secondary" disabled={!canRedo}>
                {t('game.redo')}
              </Button>

              <Button onClick={onPause} variant="secondary">
                {t('game.pause')}
              </Button>
            </>
          )}

          {isPaused && (
            <Button onClick={onResume} variant="success">
              {t('game.resume')}
            </Button>
          )}
        </div>
      )}

      {isCompleted && (
        <div className="bg-green-100 dark:bg-green-900/40 border-2 border-green-600 dark:border-green-500 rounded-lg p-4 text-center flex flex-col items-center gap-3">
          <p className="text-xl font-bold text-green-800 dark:text-green-300">
            {t('game.completed')}
          </p>
          <Button onClick={onShare} variant="primary" data-testid="share-button">
            {t('game.share')}
          </Button>
        </div>
      )}
    </div>
  );
}
