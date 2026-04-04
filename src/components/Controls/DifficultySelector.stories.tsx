import { DifficultySelector } from './DifficultySelector';
import { useState } from 'react';

export default {
  title: 'Controls/DifficultySelector',
  component: DifficultySelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Easy = {
  args: {
    currentDifficulty: 'EASY',
    onDifficultyChange: (level) => console.log(`Difficulty changed to ${level}`),
    disabled: false,
  },
};

export const Medium = {
  args: {
    currentDifficulty: 'MEDIUM',
    onDifficultyChange: (level) => console.log(`Difficulty changed to ${level}`),
    disabled: false,
  },
};

export const Hard = {
  args: {
    currentDifficulty: 'HARD',
    onDifficultyChange: (level) => console.log(`Difficulty changed to ${level}`),
    disabled: false,
  },
};

export const Expert = {
  args: {
    currentDifficulty: 'EXPERT',
    onDifficultyChange: (level) => console.log(`Difficulty changed to ${level}`),
    disabled: false,
  },
};

export const Disabled = {
  args: {
    currentDifficulty: 'MEDIUM',
    onDifficultyChange: (level) => console.log(`Difficulty changed to ${level}`),
    disabled: true,
  },
};

export const Interactive = () => {
  const [difficulty, setDifficulty] = useState('MEDIUM');

  return (
    <div>
      <DifficultySelector
        currentDifficulty={difficulty}
        onDifficultyChange={setDifficulty}
        disabled={false}
      />
      <p className="mt-4 text-sm text-gray-600">
        Current difficulty: <strong>{difficulty}</strong>
      </p>
    </div>
  );
};
