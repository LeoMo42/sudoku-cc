import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingTour } from './OnboardingTour';

// Minimal i18n stub
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('OnboardingTour', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    // Stub scrollIntoView — not available in jsdom
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders first step and shows Next button', () => {
    render(<OnboardingTour onClose={onClose} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('tour.next')).toBeTruthy();
    expect(screen.getByText('tour.skip')).toBeTruthy();
  });

  it('Skip calls onClose immediately', () => {
    render(<OnboardingTour onClose={onClose} />);
    fireEvent.click(screen.getByText('tour.skip'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Next advances through steps; last step shows done label', () => {
    render(<OnboardingTour onClose={onClose} />);
    const STEP_COUNT = 5;
    // Click Next through all but last step
    for (let i = 0; i < STEP_COUNT - 1; i++) {
      fireEvent.click(screen.getByText('tour.next'));
    }
    // Now on last step — button label should be 'done'
    expect(screen.getByText('tour.done')).toBeTruthy();
  });

  it('clicking done on last step calls onClose', () => {
    render(<OnboardingTour onClose={onClose} />);
    const STEP_COUNT = 5;
    for (let i = 0; i < STEP_COUNT - 1; i++) {
      fireEvent.click(screen.getByText('tour.next'));
    }
    fireEvent.click(screen.getByText('tour.done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape key calls onClose', () => {
    render(<OnboardingTour onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has aria-modal on the dialog', () => {
    render(<OnboardingTour onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });
});
