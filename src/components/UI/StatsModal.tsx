import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { formatTime } from '../../hooks/useTimer';
import type { StatsStore } from '../../utils/stats';
import { SUDOKU_TYPES, DIFFICULTY_LEVELS } from '../../utils/constants';
import type { SudokuTypeId, DifficultyLevel } from '../../types/index';

interface StatsModalProps {
  open: boolean;
  store: StatsStore;
  onClose: () => void;
  onReset: () => void;
}

const DIFFICULTIES = Object.keys(DIFFICULTY_LEVELS) as DifficultyLevel[];

interface Row {
  type: SudokuTypeId;
  difficulty: DifficultyLevel;
  started: number;
  completed: number;
  winRate: number;
  bestTime: number | null;
  avgTime: number | null;
  mistakes: number;
}

function buildRows(store: StatsStore): Row[] {
  const rows: Row[] = [];
  for (const typeId of Object.keys(SUDOKU_TYPES) as SudokuTypeId[]) {
    for (const diff of DIFFICULTIES) {
      const key = `${typeId}:${diff}`;
      const rec = store.records[key];
      if (!rec || rec.gamesStarted === 0) continue;
      rows.push({
        type: typeId,
        difficulty: diff,
        started: rec.gamesStarted,
        completed: rec.gamesCompleted,
        winRate: rec.gamesStarted > 0 ? Math.round((rec.gamesCompleted / rec.gamesStarted) * 100) : 0,
        bestTime: rec.bestTime,
        avgTime: rec.gamesCompleted > 0 ? Math.round(rec.totalTime / rec.gamesCompleted) : null,
        mistakes: rec.totalMistakes,
      });
    }
  }
  return rows;
}

export function StatsModal({ open, store, onClose, onReset }: StatsModalProps) {
  const { t } = useTranslation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleClose = () => {
    setConfirmingReset(false);
    onClose();
  };

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const rows = buildRows(store);
  const hasData = rows.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 id="stats-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {t('stats.title')}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors text-xl leading-none"
            aria-label={t('stats.close')}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {!hasData ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              {t('stats.noData')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 pr-3 whitespace-nowrap">{t('stats.variant')}</th>
                    <th className="pb-2 pr-3 whitespace-nowrap">{t('stats.difficulty')}</th>
                    <th className="pb-2 pr-3 text-right whitespace-nowrap">{t('stats.games')}</th>
                    <th className="pb-2 pr-3 text-right whitespace-nowrap">{t('stats.winRate')}</th>
                    <th className="pb-2 pr-3 text-right whitespace-nowrap">{t('stats.bestTime')}</th>
                    <th className="pb-2 pr-3 text-right whitespace-nowrap">{t('stats.avgTime')}</th>
                    <th className="pb-2 text-right whitespace-nowrap">{t('stats.mistakes')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.map(row => (
                    <tr key={`${row.type}:${row.difficulty}`} className="text-gray-800 dark:text-gray-200">
                      <td className="py-2 pr-3 font-medium whitespace-nowrap">
                        {t(`sudokuTypes.${row.type}.name`)}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {t(`difficulty.${row.difficulty}`)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {row.completed}/{row.started}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {row.winRate}%
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-mono">
                        {row.bestTime !== null ? formatTime(row.bestTime) : '—'}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-mono">
                        {row.avgTime !== null ? formatTime(row.avgTime) : '—'}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {row.mistakes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700 shrink-0 gap-3">
          {confirmingReset ? (
            <>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                {t('stats.resetConfirm')}
              </p>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" onClick={() => setConfirmingReset(false)}>
                  {t('stats.resetCancel')}
                </Button>
                <Button variant="danger" onClick={() => { onReset(); setConfirmingReset(false); }}>
                  {t('stats.resetConfirmYes')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => setConfirmingReset(true)}
                disabled={!hasData}
              >
                {t('stats.reset')}
              </Button>
              <Button variant="primary" onClick={handleClose}>
                {t('stats.close')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
