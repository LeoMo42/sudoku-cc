import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('kaboom');
}

// localStorage that EXISTS and throws on every access — Safari private mode,
// third-party-cookie blocks, enterprise "disable site data" policies.
function mockThrowingStorage(): Storage {
  return {
    length: 0,
    clear: () => { throw new Error('SecurityError'); },
    getItem: () => { throw new Error('SecurityError'); },
    key: () => { throw new Error('SecurityError'); },
    removeItem: () => { throw new Error('SecurityError'); },
    setItem: () => { throw new Error('SecurityError'); },
  } satisfies Storage;
}

describe('ErrorBoundary', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React logs the caught error and its component stack; both are expected.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('renders children when nothing throws', () => {
    render(<ErrorBoundary><p>all good</p></ErrorBoundary>);
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('renders the recovery screen when a child throws', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  // Regression #271. The fallback used to read localStorage with only a
  // `typeof localStorage !== 'undefined'` guard, which tests for ABSENCE. In a
  // browser where storage is present but throws, the fallback threw while
  // rendering — and a throw inside an error boundary's own fallback is not
  // catchable by that boundary. The recovery screen became a blank page, in
  // exactly the browsers where errors are most likely.
  it('still renders the recovery screen when localStorage throws', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: mockThrowingStorage(),
      configurable: true,
      writable: true,
    });

    try {
      expect(() => render(<ErrorBoundary><Boom /></ErrorBoundary>)).not.toThrow();
      // Falls back to the default language rather than dying on the read.
      expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'localStorage', {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });

  it('honours a stored language when storage works', () => {
    localStorage.setItem('language', 'en');
    try {
      render(<ErrorBoundary><Boom /></ErrorBoundary>);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    } finally {
      localStorage.clear();
    }
  });
});
