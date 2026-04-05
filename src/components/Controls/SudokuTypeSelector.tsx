import { useState, useRef, useEffect } from 'react';
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
 * Renders as a dropdown on mobile, full button list on large screens
 */
export function SudokuTypeSelector({ currentType, onTypeChange, disabled }: SudokuTypeSelectorProps) {
  const { t } = useTranslation();
  const types = Object.values(SUDOKU_TYPES);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
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
        <div className="absolute mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50" role="listbox">
          {types.map((type) => (
            <button
              key={type.id}
              role="option"
              aria-selected={currentType === type.id}
              onClick={() => {
                onTypeChange(type.id);
                setOpen(false);
              }}
              disabled={disabled}
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
      )}
    </div>
  );
}
