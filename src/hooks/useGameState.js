import { useContext } from 'react';
import { GameContext } from '../context/GameContext';

/**
 * Custom hook to access game state and actions
 * @returns {Object} Game state and actions
 */
export function useGameState() {
  const context = useContext(GameContext);

  if (!context) {
    throw new Error('useGameState must be used within a GameProvider');
  }

  return context;
}
