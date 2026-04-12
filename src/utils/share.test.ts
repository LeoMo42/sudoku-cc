import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatElapsed, buildShareUrl, shareOrCopy } from './share';

describe('formatElapsed', () => {
  it('formats seconds under a minute', () => {
    expect(formatElapsed(45)).toBe('0:45');
  });
  it('pads single-digit seconds', () => {
    expect(formatElapsed(63)).toBe('1:03');
  });
  it('formats 7 minutes 23 seconds', () => {
    expect(formatElapsed(443)).toBe('7:23');
  });
  it('formats exactly one hour', () => {
    expect(formatElapsed(3600)).toBe('60:00');
  });
});

describe('buildShareUrl', () => {
  it('appends type and difficulty as query params', () => {
    const url = buildShareUrl('CLASSIC', 'HARD', 'https://example.com');
    expect(url).toBe('https://example.com?type=CLASSIC&difficulty=HARD');
  });
  it('encodes special characters', () => {
    const url = buildShareUrl('ANTI_KNIGHT', 'EASY', 'https://example.com');
    expect(url).toContain('ANTI_KNIGHT');
  });
});

describe('shareOrCopy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "shared" when navigator.share succeeds', async () => {
    Object.defineProperty(navigator, 'share', {
      writable: true, configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    expect(await shareOrCopy('text', 'https://example.com')).toBe('shared');
  });

  it('returns "cancelled" when navigator.share throws AbortError', async () => {
    Object.defineProperty(navigator, 'share', {
      writable: true, configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')),
    });
    expect(await shareOrCopy('text', 'https://example.com')).toBe('cancelled');
  });

  it('falls back to clipboard when navigator.share throws non-abort error', async () => {
    Object.defineProperty(navigator, 'share', {
      writable: true, configurable: true,
      value: vi.fn().mockRejectedValue(new Error('not allowed')),
    });
    Object.defineProperty(navigator, 'clipboard', {
      writable: true, configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    expect(await shareOrCopy('text', 'https://example.com')).toBe('copied');
  });

  it('returns "copied" when only clipboard is available', async () => {
    const nav = navigator as unknown as Record<string, unknown>;
    delete nav['share'];
    Object.defineProperty(navigator, 'clipboard', {
      writable: true, configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    expect(await shareOrCopy('text', 'https://example.com')).toBe('copied');
  });

  it('returns "failed" when neither API is available', async () => {
    const nav = navigator as unknown as Record<string, unknown>;
    delete nav['share'];
    delete nav['clipboard'];
    expect(await shareOrCopy('text', 'https://example.com')).toBe('failed');
  });
});
