/** Formats elapsed seconds as M:SS (e.g. 443 → "7:23"). */
export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Builds the share text shown in the native share sheet or copied to clipboard.
 * Receives already-translated strings so the function stays pure and testable.
 */
export function buildShareText(
  typeName: string,
  difficultyName: string,
  elapsedSeconds: number,
  appUrl: string,
): string {
  return `I solved ${typeName} (${difficultyName}) in ${formatElapsed(elapsedSeconds)}! ${appUrl}`;
}

/**
 * Builds a deep-link URL that restores the same variant + difficulty.
 * Falls back to origin when window is unavailable (SSR / test).
 */
export function buildShareUrl(
  type: string,
  difficulty: string,
  baseUrl: string,
): string {
  return `${baseUrl}?type=${encodeURIComponent(type)}&difficulty=${encodeURIComponent(difficulty)}`;
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Tries navigator.share first; falls back to navigator.clipboard.writeText.
 * Returns the outcome so callers can decide whether to show a toast.
 */
export async function shareOrCopy(text: string, url: string): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({ text, url });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // share failed — fall through to clipboard
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${text.trim()} ${url}`);
      return 'copied';
    } catch { /* fall through */ }
  }
  return 'failed';
}
