import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SudokuTypeSelector } from './SudokuTypeSelector';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('SudokuTypeSelector', () => {
  const defaultProps = {
    currentType: 'CLASSIC' as const,
    onTypeChange: vi.fn(),
    disabled: false,
  };

  it('should close dropdown on touchstart outside', () => {
    render(<SudokuTypeSelector {...defaultProps} />);

    // Open dropdown via trigger button
    const trigger = screen.getByRole('button', { name: /classic/i });
    fireEvent.click(trigger);

    // Dropdown should be open
    expect(screen.getByRole('listbox')).toBeDefined();

    // Simulate touchstart outside the dropdown
    fireEvent.touchStart(document.body);

    // Dropdown should close
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('should close dropdown on mousedown outside', () => {
    render(<SudokuTypeSelector {...defaultProps} />);

    const trigger = screen.getByRole('button', { name: /classic/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('listbox')).toBeDefined();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('should call onTypeChange when selecting a type', () => {
    const onTypeChange = vi.fn();
    render(
      <SudokuTypeSelector {...defaultProps} onTypeChange={onTypeChange} />
    );

    // Open dropdown
    const trigger = screen.getByRole('button', { name: /classic/i });
    fireEvent.click(trigger);

    // Click a type option (second one, DIAGONAL)
    const options = screen.getAllByRole('option');
    fireEvent.click(options[1]!);

    expect(onTypeChange).toHaveBeenCalledWith('DIAGONAL');
  });

  it('should show scroll hint gradient when listbox is scrollable', () => {
    const originalGetter = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get() { return 500; } });
    const clientGetter = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 256; } });

    try {
      const { container } = render(<SudokuTypeSelector {...defaultProps} />);
      const trigger = screen.getByRole('button', { name: /classic/i });
      fireEvent.click(trigger);

      const gradient = container.querySelector('[data-testid="scroll-gradient"]');
      expect(gradient).not.toBeNull();
    } finally {
      if (originalGetter) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalGetter);
      if (clientGetter) Object.defineProperty(HTMLElement.prototype, 'clientHeight', clientGetter);
    }
  });

  it('should hide scroll hint when not scrollable', () => {
    const originalGetter = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get() { return 200; } });
    const clientGetter = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 200; } });

    try {
      const { container } = render(<SudokuTypeSelector {...defaultProps} />);
      const trigger = screen.getByRole('button', { name: /classic/i });
      fireEvent.click(trigger);

      const gradient = container.querySelector('[data-testid="scroll-gradient"]');
      expect(gradient).toBeNull();
    } finally {
      if (originalGetter) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalGetter);
      if (clientGetter) Object.defineProperty(HTMLElement.prototype, 'clientHeight', clientGetter);
    }
  });
});
