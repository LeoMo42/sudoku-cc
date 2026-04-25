import { StreakBanner } from './StreakBanner';

const dailyInfo = {
  dayNumber: 42,
  date: '2026-04-13',
  seed: 12345,
  type: 'classic' as const,
  difficulty: 'easy' as const,
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
