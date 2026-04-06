import { useState, useRef, useEffect, useLayoutEffect, useCallback, type UIEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SUDOKU_TYPES } from '../../utils/constants';
import type { SudokuTypeId } from '../../types/index';

interface SudokuTypeSelectorProps {
  currentType: SudokuTypeId;
  onTypeChange: (type: SudokuTypeId) => void;
  disabled: boolean;
}

/**
 * Sudoku type selector component
 * Collapsible dropdown on all viewports
 */
export function SudokuTypeSelector({ currentType, onTypeChange, disabled }: SudokuTypeSelectorProps) {
  const { t } = useTranslation();
  const types = Object.values(SUDOKU_TYPES);
  const [open, setOpen] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setShowScrollHint(true);
    triggerRef.current?.focus();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [open, close]);

  // Measure scrollability synchronously before paint to avoid gradient flash
  useLayoutEffect(() => {
    if (open) {
      const el = listboxRef.current;
      if (el) setShowScrollHint(el.scrollHeight > el.clientHeight);
    }
  }, [open]);

  // Focus first option when listbox opens
  useEffect(() => {
    if (open) {
      const firstOption = listboxRef.current?.querySelector<HTMLButtonElement>('[role="option"]');
      firstOption?.focus();
    }
  }, [open]);

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    // 8px accounts for sub-pixel rounding across browsers
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
    setShowScrollHint(!atBottom);
  }, []);

  const handleListboxKeyDown = (e: React.KeyboardEvent) => {
    const options = listboxRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
    if (!options?.length) return;

    const focused = document.activeElement as HTMLButtonElement;
    const currentIndex = Array.from(options).indexOf(focused);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        options[Math.min(currentIndex + 1, options.length - 1)]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        options[Math.max(currentIndex - 1, 0)]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        options[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        options[options.length - 1]?.focus();
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
    }
  };

  const triggerId = 'type-selector-trigger';
  const listboxId = 'type-selector-listbox';

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={triggerRef}
        id={triggerId}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); }
        }}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        className="w-full px-4 py-3 rounded-lg font-medium bg-purple-600 text-white text-left flex items-center justify-between disabled:opacity-50"
      >
        <div>
          <div className="font-bold text-sm">
            {t(`sudokuTypes.${currentType}.name`)}
          </div>
          <div className="text-xs opacity-90 mt-0.5">
            {t(`sudokuTypes.${currentType}.description`)}
          </div>
        </div>
        <svg
          className={`w-5 h-5 ml-2 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute mt-1 w-full z-50">
          <div
            ref={listboxRef}
            id={listboxId}
            className="w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
            role="listbox"
            aria-labelledby={triggerId}
            onKeyDown={handleListboxKeyDown}
            onScroll={handleScroll}
          >
            {types.map((type) => (
              <button
                key={type.id}
                role="option"
                aria-selected={currentType === type.id}
                onClick={() => {
                  onTypeChange(type.id);
                  close();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onTypeChange(type.id);
                    close();
                  }
                }}
                disabled={disabled}
                tabIndex={-1}
                className={`
                  w-full px-4 py-2.5 text-left transition-colors border-b border-gray-100 last:border-b-0
                  ${currentType === type.id
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-gray-900 hover:bg-gray-50'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <div className="font-bold text-sm">
                  {t(`sudokuTypes.${type.id}.name`)}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {t(`sudokuTypes.${type.id}.description`)}
                </div>
              </button>
            ))}
          </div>
          {showScrollHint && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent rounded-b-lg pointer-events-none" aria-hidden="true" data-testid="scroll-gradient" />
          )}
        </div>
      )}
    </div>
  );
}
