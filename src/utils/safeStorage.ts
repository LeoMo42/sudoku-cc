/**
 * Best-effort localStorage access.
 *
 * `localStorage` is not merely absent-or-present. In restricted environments —
 * Safari private mode, third-party-cookie blocks, blocked-domain policies,
 * enterprise "disable site data" settings — the object EXISTS and every access
 * to it throws `SecurityError`. `QuotaExceededError` is the same story on write.
 *
 * That makes the two obvious guards useless:
 *
 *   typeof localStorage !== 'undefined' && localStorage.getItem(k)   // still throws
 *   window.localStorage?.getItem(k)                                  // still throws
 *
 * Both test for absence. Neither catches a throw from a present-but-unreadable
 * store. Only try/catch does (#218, #271).
 *
 * These helpers swallow the throw so a hostile storage environment costs the
 * user persistence rather than the whole app. They live here, not inside a
 * component or context, because the failure is global: every caller that
 * touches storage during render is a potential white screen.
 */

/**
 * Read a key. Returns null when storage is unavailable, unreadable, or the key
 * is unset — the caller cannot tell those apart, and should not need to.
 */
export function safeGetItem(key: string): string | null {
  try {
    return window.localStorage?.getItem(key) ?? null;
  } catch (error) {
    console.warn('Failed to read from localStorage:', error);
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage?.setItem(key, value);
  } catch (error) {
    console.warn('Failed to persist to localStorage:', error);
  }
}

export function safeRemoveItem(key: string): void {
  try {
    window.localStorage?.removeItem(key);
  } catch {
    // ignore — callers only reach here on a cleanup path that is already
    // handling a failure, and a warning here would be noise on top of noise
  }
}
