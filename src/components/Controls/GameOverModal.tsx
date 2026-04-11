import { useTranslation } from 'react-i18next';
import { Button } from '../UI/Button';

interface GameOverModalProps {
  /** When true the modal renders. Owner controls visibility. */
  open: boolean;
  /** The mistake limit that was reached, shown in the message. */
  limit: number;
  /** Called when the player chooses to start a fresh puzzle. */
  onNewGame: () => void;
}

/**
 * Terminal "you lost" overlay shown when the mistake limit has been
 * reached. There is intentionally no dismiss/close action — the only
 * way out is to start a new game, which mirrors how NYT and Sudoku.com
 * handle losses. Suppressing the backdrop click ensures players don't
 * dismiss it by accident and end up staring at a frozen board.
 */
export function GameOverModal({ open, limit, onNewGame }: GameOverModalProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
      data-testid="game-over-modal"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4 items-center text-center">
        <div className="text-5xl" aria-hidden="true">💥</div>
        <h2 id="game-over-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t('game.gameOver')}
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {t('game.gameOverMessage', { limit })}
        </p>
        <Button onClick={onNewGame} variant="primary" autoFocus>
          {t('game.gameOverNewGame')}
        </Button>
      </div>
    </div>
  );
}
