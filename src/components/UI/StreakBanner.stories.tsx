import type { DailyInfo } from '../../utils/dailyPuzzle';
import { StreakBanner } from './StreakBanner';

// dayNumber matches the date string: Apr 13, 2026 = 9599 days since
// 2000-01-01 UTC (toDayNumber convention from dailyPuzzle.ts). Type and
// difficulty use the canonical uppercase enum values from src/types/index.ts
// — the previous mock used 'classic'/'easy' which compiled via `as const`
// but didn't match any real SudokuTypeId/DifficultyLevel value.
const dailyInfo: DailyInfo = {
  dayNumber: 9599,
  date: '2026-04-13',
  seed: 12345,
  type: 'CLASSIC',
  difficulty: 'EASY',
};

export default {
  title: 'UI/StreakBanner',
  component: StreakBanner,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    dailyInfo,
    onPlay: () => alert('Play daily!'),
  },
};

export const PlayCta = {
  args: {
    isCompleted: false,
    isPlayingDaily: false,
    streak: { current: 5, best: 12 },
  },
};

export const Playing = {
  args: {
    isCompleted: false,
    isPlayingDaily: true,
    streak: { current: 5, best: 12 },
  },
};

export const NoStreak = {
  args: {
    isCompleted: false,
    isPlayingDaily: false,
    streak: { current: 0, best: 0 },
  },
};

export const Completed = {
  args: {
    isCompleted: true,
    isPlayingDaily: false,
    streak: { current: 6, best: 12 },
  },
};

export const CompletedNoStreak = {
  args: {
    isCompleted: true,
    isPlayingDaily: false,
    streak: { current: 0, best: 0 },
  },
};
