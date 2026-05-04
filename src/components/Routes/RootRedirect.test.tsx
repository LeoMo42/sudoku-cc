// Regression #226 bug 2 — RootRedirect dropped query params on the
// way to /{lang}, breaking deep-links like
// `?type=KILLER&difficulty=EXPERT` that useAutoStartIdle reads to
// auto-start a specific puzzle.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { RootRedirect } from './RootRedirect';

// Probe component that surfaces the URL the redirect landed on so the
// assertion can inspect both pathname and search.
function LocationProbe() {
  const loc = useLocation();
  return (
    <div data-testid="probe">
      {loc.pathname}|{loc.search}
    </div>
  );
}

function renderAt(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/:lang" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RootRedirect', () => {
  beforeEach(() => {
    localStorage.clear();
    // Pin navigator to a value that doesn't accidentally match a
    // supported language so the test outcomes are deterministic.
    Object.defineProperty(window, 'navigator', {
      value: { language: 'en-US' },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects to the preferred language root when there is no query', () => {
    localStorage.setItem('language', 'ru');
    const { getByTestId } = renderAt('/');
    expect(getByTestId('probe').textContent).toBe('/ru|');
  });

  it('preserves location.search through the redirect', () => {
    localStorage.setItem('language', 'en');
    const { getByTestId } = renderAt('/?type=KILLER&difficulty=EXPERT');
    expect(getByTestId('probe').textContent).toBe(
      '/en|?type=KILLER&difficulty=EXPERT',
    );
  });

  it('preserves a single-key search string too', () => {
    localStorage.setItem('language', 'ru');
    const { getByTestId } = renderAt('/?seed=12345');
    expect(getByTestId('probe').textContent).toBe('/ru|?seed=12345');
  });
});
