import { useTranslation } from 'react-i18next';
import type { SudokuTypeId } from '../../types/index';

interface Props {
  variant: SudokuTypeId;
}

/**
 * Per-variant landing copy rendered between the masthead/streak banner
 * and the game itself on `/{lang}/{slug}` pages. Two parts:
 *
 *   1. Intro paragraph: the variant's one-line `description` (already
 *      used in the type-selector dropdown). Same string, but here it
 *      reads as the page lede instead of a dropdown label.
 *   2. Collapsible rules: a `<details>` block with the full rules
 *      paragraph from `howToPlay.variants.{X}.rules` — the same copy
 *      the in-game How-to-Play modal shows. Default-closed so the
 *      page doesn't push the board below the fold; content is still
 *      in the DOM (and prerendered HTML), so SEO crawlers index it.
 *
 * Zero new i18n keys — everything is reused from existing data
 * (sudokuTypes / howToPlay) so this PR ships per-variant SEO content
 * across both locales without a 78-string translation drop.
 */
export function VariantLanding({ variant }: Props) {
  const { t } = useTranslation();
  return (
    <section className="mb-4 sm:mb-6 print:hidden" data-testid="variant-landing">
      <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-3">
        {t(`sudokuTypes.${variant}.description`)}
      </p>
      <details className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 select-none list-none flex items-center justify-between">
          <span>{t('howToPlay.title')}</span>
          <span aria-hidden="true" className="text-xs text-gray-500 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="px-4 pb-4 pt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
          {t(`howToPlay.variants.${variant}.rules`)}
        </div>
      </details>
    </section>
  );
}
