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
    const { container } = render(<SudokuTypeSelector {...defaultProps} />);

    // Open the mobile dropdown
    const button = container.querySelector('.lg\\:hidden button')!;
    fireEvent.click(button);

    // Dropdown should be open
    expect(screen.getByRole('listbox')).toBeDefined();

    // Simulate touchstart outside the dropdown
    fireEvent.touchStart(document.body);

    // Dropdown should close
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('should close dropdown on mousedown outside', () => {
    const { container } = render(<SudokuTypeSelector {...defaultProps} />);

    const button = container.querySelector('.lg\\:hidden button')!;
    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toBeDefined();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('should call onTypeChange when selecting a type', () => {
    const onTypeChange = vi.fn();
    const { container } = render(
      <SudokuTypeSelector {...defaultProps} onTypeChange={onTypeChange} />
    );

    // Open dropdown
    const button = container.querySelector('.lg\\:hidden button')!;
    fireEvent.click(button);

    // Click a type option (second one, DIAGONAL)
    const options = screen.getByRole('listbox').querySelectorAll('button');
    fireEvent.click(options[1]!);

    expect(onTypeChange).toHaveBeenCalledWith('DIAGONAL');
  });
});
