import { useContext } from 'react';
import { GameContext } from '../context/GameContext';
import type { GameContextValue } from '../types/index';

export function useGameState(): GameContextValue {
  const context = useContext(GameContext);

  if (!context) {
    throw new Error('useGameState must be used within a GameProvider');
  }

  return context;
}
