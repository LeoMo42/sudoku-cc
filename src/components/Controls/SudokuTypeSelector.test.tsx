import { describe, it, expect, vi, afterEach } from 'vitest';
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

  describe('scroll hint gradient', () => {
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
    const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');

    function mockScrollDimensions(scrollH: number, clientH: number) {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get() { return scrollH; } });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return clientH; } });
    }

    function restoreScrollDimensions() {
      if (originalScrollHeight) {
        Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
      } else {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollHeight;
      }
      if (originalClientHeight) {
        Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
      } else {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
      }
    }

    afterEach(() => {
      restoreScrollDimensions();
    });

    it('should show gradient when listbox is scrollable', () => {
      mockScrollDimensions(500, 256);

      const { container } = render(<SudokuTypeSelector {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /classic/i }));

      expect(container.querySelector('[data-testid="scroll-gradient"]')).not.toBeNull();
    });

    it('should hide gradient when not scrollable', () => {
      mockScrollDimensions(200, 200);

      const { container } = render(<SudokuTypeSelector {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /classic/i }));

      expect(container.querySelector('[data-testid="scroll-gradient"]')).toBeNull();
    });

    it('should hide gradient when scrolled to bottom', () => {
      mockScrollDimensions(500, 256);

      const { container } = render(<SudokuTypeSelector {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /classic/i }));

      // Gradient should be visible initially
      expect(container.querySelector('[data-testid="scroll-gradient"]')).not.toBeNull();

      // Simulate scrolling to bottom
      const listbox = screen.getByRole('listbox');
      Object.defineProperty(listbox, 'scrollTop', { configurable: true, value: 244 });
      fireEvent.scroll(listbox);

      expect(container.querySelector('[data-testid="scroll-gradient"]')).toBeNull();
    });
  });
});
