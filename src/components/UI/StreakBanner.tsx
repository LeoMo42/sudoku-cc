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
  // setDate(+1) + setHours(0,0,0,0) is DST-safe (JS Date arithmetic on local
  // days normalizes wall-clock days). setHours(24,…) was unsafe on fall-back
  // nights where 25:xx:xx could appear briefly.
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  // Clamp to 0 so a clock that ticks exactly to midnight can't render
  // negative or garbled times.
  const diff = Math.max(0, midnight.getTime() - now.getTime());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function StreakBanner({ dailyInfo, isCompleted, isPlayingDaily, streak, onPlay }: StreakBannerProps) {
  const { t } = useTranslation();
  // Initial value gated on isCompleted: when not in completion state the
  // countdown is hidden anyway, so skip the computation. Empty string is
  // never rendered visibly.
  const [countdown, setCountdown] = useState(() => isCompleted ? timeUntilMidnight() : '');

  useEffect(() => {
    if (!isCompleted) return;
    // Synchronous first tick so the initial paint after isCompleted flips
    // true shows a real countdown, not the empty-string seed.
    const tick = () => setCountdown(timeUntilMidnight());
    tick();
    const id = setInterval(tick, 1_000);
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
          {/*
            aria-hidden so screen readers don't re-announce the countdown
            on every 1Hz tick (#141). The countdown is decorative — the
            surrounding "Completed ✓" text already conveys the load-bearing
            information ("you're done for today, come back tomorrow"). SR
            users don't need second-level precision on when to come back.
          */}
          <span
            aria-hidden="true"
            className="text-xs text-gray-500 dark:text-gray-400 tabular-nums font-mono whitespace-nowrap flex-shrink-0"
          >
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
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap flex-shrink-0 group-hover:translate-x-0.5 group-disabled:translate-x-0 transition-transform">
            {isPlayingDaily ? t('daily.playing') : t('daily.playCta')}
          </span>
        </button>
      )}
    </div>
  );
}
