import { formatTime } from '../../hooks/useTimer';

/**
 * Timer display component
 */
export function Timer({ elapsedTime }) {
  return (
    <div className="text-2xl font-mono font-bold text-gray-800">
      {formatTime(elapsedTime)}
    </div>
  );
}
