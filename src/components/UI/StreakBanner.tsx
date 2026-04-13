import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DailyInfo } from '../../utils/dailyPuzzle';

interface StreakBannerProps {
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

export function StreakBanner({ dailyInfo, isCompleted, isPlayingDaily, streak, onPlay }: StreakBannerProps) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(timeUntilMidnight);

  useEffect(() => {
    if (!isCompleted) return;
    const id = setInterval(() => setCountdown(timeUntilMidnight()), 1_000);
    return () => clearInterval(id);
  }, [isCompleted]);

  const dayLabel = t('daily.day', { number: dailyInfo.dayNumber });
  const streakNode = streak.current > 0
    ? <><span aria-hidden="true">🔥</span>{' '}{t('daily.streak', { count: streak.current })}</>
    : <>{t('daily.startStreak')}</>;

  return (
    <div className="mb-4 sm:mb-6 print:hidden">
      {isCompleted ? (
        <div className="flex items-center justify-between gap-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-semibold text-green-700 dark:text-green-400 whitespace-nowrap">
              {dayLabel}
            </span>
            <span className="hidden sm:inline text-gray-300 dark:text-gray-600">·</span>
            <span className="hidden sm:inline text-sm font-medium text-orange-500 dark:text-orange-400 whitespace-nowrap">
              {streakNode}
            </span>
            <span className="hidden sm:inline text-gray-300 dark:text-gray-600">·</span>
            <span className="text-sm font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
              {t('daily.completed')}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums font-mono whitespace-nowrap flex-shrink-0">
            {t('daily.nextIn', { time: countdown })}
          </span>
        </div>
      ) : (
        <button
          onClick={onPlay}
          disabled={isPlayingDaily}
          data-testid="streak-banner-play"
          className="w-full flex items-center justify-between gap-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:cursor-default group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
              {dayLabel}
            </span>
            <span className="hidden sm:inline text-gray-300 dark:text-gray-600">·</span>
            <span className="hidden sm:inline text-sm font-medium text-orange-500 dark:text-orange-400 whitespace-nowrap">
              {streakNode}
            </span>
          </div>
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
            {isPlayingDaily ? t('daily.playing') : t('daily.playCta')}
          </span>
        </button>
      )}
    </div>
  );
}
