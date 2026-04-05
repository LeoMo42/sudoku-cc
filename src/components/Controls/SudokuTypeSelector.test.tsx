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
    const trigger = screen.getByRole('button', { expanded: false });
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

    const trigger = screen.getByRole('button', { expanded: false });
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
    const trigger = screen.getByRole('button', { expanded: false });
    fireEvent.click(trigger);

    // Click a type option (second one, DIAGONAL)
    const options = screen.getAllByRole('option');
    fireEvent.click(options[1]!);

    expect(onTypeChange).toHaveBeenCalledWith('DIAGONAL');
  });
});
