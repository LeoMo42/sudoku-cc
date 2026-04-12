import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DailyInfo } from '../../utils/dailyPuzzle';

interface DailyBannerProps {
  dailyInfo: DailyInfo;
  isCompleted: boolean;
  isPlayingDaily: boolean;
  streak: { current: number; best: number };
  onPlay: () => void;
}

function timeUntilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function DailyBanner({ dailyInfo, isCompleted, isPlayingDaily, streak, onPlay }: DailyBannerProps) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(timeUntilMidnight);

  useEffect(() => {
    const id = setInterval(() => setCountdown(timeUntilMidnight()), 1_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            {t('daily.title')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t('daily.day', { number: dailyInfo.dayNumber })}
            {' · '}
            {t(`sudokuTypes.${dailyInfo.type}.name`)}
            {' · '}
            {t(`difficulty.${dailyInfo.difficulty}`)}
          </p>
        </div>
        {streak.current > 0 && (
          <div className="text-right">
            <span className="text-lg" aria-hidden="true">🔥</span>
            <p className="text-xs font-semibold text-orange-500 dark:text-orange-400 tabular-nums">
              {t('daily.streak', { count: streak.current })}
            </p>
          </div>
        )}
      </div>

      {/* Action button */}
      {isCompleted ? (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-sm font-medium text-green-600 dark:text-green-400">
            {t('daily.completed')}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums font-mono">
            {t('daily.nextIn', { time: countdown })}
          </span>
        </div>
      ) : (
        <button
          onClick={onPlay}
          disabled={isPlayingDaily}
          data-testid="daily-play-button"
          className="w-full py-2 px-4 rounded-lg text-sm font-semibold transition-colors
            bg-indigo-600 hover:bg-indigo-700 text-white
            disabled:bg-indigo-400 dark:disabled:bg-indigo-700 disabled:cursor-default"
        >
          {isPlayingDaily ? t('daily.playing') : t('daily.play')}
        </button>
      )}
    </div>
  );
}
