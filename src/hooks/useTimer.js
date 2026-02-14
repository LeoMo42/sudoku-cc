import { useEffect } from 'react';
import { GAME_STATUS } from '../utils/constants';

/**
 * Custom hook for managing game timer
 * @param {string} gameStatus - Current game status
 * @param {Function} updateTime - Function to increment time
 */
export function useTimer(gameStatus, updateTime) {
  useEffect(() => {
    if (gameStatus !== GAME_STATUS.PLAYING) {
      return;
    }

    const interval = setInterval(() => {
      updateTime();
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStatus, updateTime]);
}

/**
 * Format elapsed time in seconds to MM:SS format
 * @param {number} seconds - Elapsed time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
