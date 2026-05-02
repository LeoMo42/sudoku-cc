import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../UI/Button';
import type { SudokuTypeId } from '../../types/index';

interface HowToPlayModalProps {
  open: boolean;
  sudokuType: SudokuTypeId;
  dontShowAgain: boolean;
  onToggleDontShowAgain: () => void;
  onClose: () => void;
}

/**
 * Modal explaining the rules of the currently selected Sudoku variant.
 * Auto-shown the first time a new variant is selected; always openable via the ? button.
 */
export function HowToPlayModal({
  open,
  sudokuType,
  dontShowAgain,
  onToggleDontShowAgain,
  onClose,
}: HowToPlayModalProps) {
  const { t } = useTranslation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const variantName = t(`sudokuTypes.${sudokuType}.name`);
  const rules = t(`howToPlay.variants.${sudokuType}.rules`);
  const tip = t(`howToPlay.variants.${sudokuType}.tip`);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="htp-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
              {t('howToPlay.title')}
            </p>
            <h2 id="htp-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {variantName}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors text-xl leading-none mt-0.5"
            aria-label={t('howToPlay.close')}
          >
            ×
          </button>
        </div>

        {/* Rules */}
        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
          {rules}
        </div>

        {/* Tip */}
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
          <span className="font-semibold">{t('howToPlay.tip')}: </span>
          {tip}
        </div>

        {/* Keyboard shortcuts (#129) — generic across all variants. The
            previous noisy single-line under the number pad is gone; this
            modal is the home for keyboard discoverability. */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {t('controls.keyboard.title')}
          </h3>
          <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-baseline gap-3">
              <kbd className="font-mono text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded whitespace-nowrap">1–9</kbd>
              <span>{t('controls.keyboard.enterDigit')}</span>
            </li>
            <li className="flex items-baseline gap-3">
              <kbd className="font-mono text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded whitespace-nowrap">↑ ↓ ← →</kbd>
              <span>{t('controls.keyboard.move')}</span>
            </li>
            <li className="flex items-baseline gap-3">
              <kbd className="font-mono text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded whitespace-nowrap">Backspace</kbd>
              <span>{t('controls.keyboard.clear')}</span>
            </li>
            <li className="flex items-baseline gap-3">
              <kbd className="font-mono text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded whitespace-nowrap">N</kbd>
              <span>{t('controls.keyboard.notes')}</span>
            </li>
            <li className="flex items-baseline gap-3">
              <kbd className="font-mono text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded whitespace-nowrap">Ctrl+Z / Ctrl+Y</kbd>
              <span>{t('controls.keyboard.undoRedo')}</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={onToggleDontShowAgain}
              className="rounded"
            />
            {t('howToPlay.dontShowAgain')}
          </label>
          <Button onClick={onClose} variant="primary">
            {t('howToPlay.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
