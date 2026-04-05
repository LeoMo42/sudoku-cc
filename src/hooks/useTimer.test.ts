import { describe, it, expect } from 'vitest';
import { formatTime } from './useTimer';

describe('formatTime', () => {
  it('should format 0 seconds as 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('should format seconds only', () => {
    expect(formatTime(5)).toBe('00:05');
    expect(formatTime(59)).toBe('00:59');
  });

  it('should format minutes and seconds', () => {
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(90)).toBe('01:30');
    expect(formatTime(125)).toBe('02:05');
  });

  it('should handle large values', () => {
    expect(formatTime(3600)).toBe('60:00');
    expect(formatTime(5999)).toBe('99:59');
    expect(formatTime(6000)).toBe('100:00');
  });

  it('should pad single digits with leading zero', () => {
    expect(formatTime(61)).toBe('01:01');
    expect(formatTime(9)).toBe('00:09');
  });
});
