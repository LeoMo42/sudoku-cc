import { formatTime } from '../../hooks/useTimer';

interface TimerProps {
  elapsedTime: number;
}

/**
 * Timer display component
 */
export function Timer({ elapsedTime }: TimerProps) {
  return (
    <div className="text-2xl font-mono font-bold text-gray-800">
      {formatTime(elapsedTime)}
    </div>
  );
}
