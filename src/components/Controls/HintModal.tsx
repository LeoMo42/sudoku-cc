import { useTranslation } from 'react-i18next';
import { Button } from '../UI/Button';
import type { HintStep, DifficultyLevel } from '../../types/index';

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  EASY:   'bg-green-100 text-green-800 border-green-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  HARD:   'bg-orange-100 text-orange-800 border-orange-300',
  EXPERT: 'bg-red-100 text-red-800 border-red-300',
};

interface HintModalProps {
  activeHint: HintStep | null;
  onApply: () => void;
  onDismiss: () => void;
}

/**
 * Modal overlay showing hint technique details.
 * Renders on top of the board while hint is active.
 */
export function HintModal({ activeHint, onApply, onDismiss }: HintModalProps) {
  const { t } = useTranslation();

  if (!activeHint) return null;

  const { technique, difficulty, placement, eliminations } = activeHint;
  const isPlacement = !!placement;

  const techniqueName = t(`hint.techniques.${technique}.name`, technique);
  const explanation = t(`hint.techniques.${technique}.explanation`, {
    row: placement ? placement.row + 1 : '',
    col: placement ? placement.col + 1 : '',
    value: placement ? placement.value : '',
  });

  const difficultyLabel = t(`hint.difficultyBadge.${difficulty}`, difficulty);
  const difficultyColor = DIFFICULTY_COLORS[difficulty] ?? DIFFICULTY_COLORS.HARD;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={onDismiss}
    >
      {/* Modal card */}
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-gray-900">{t('hint.title')}</h2>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-gray-800">{techniqueName}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded border ${difficultyColor}`}>
                {difficultyLabel}
              </span>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none mt-0.5"
            aria-label={t('hint.dismiss')}
          >
            ×
          </button>
        </div>

        {/* Step type badge */}
        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {isPlacement ? t('hint.stepType.placement') : t('hint.stepType.elimination')}
        </div>

        {/* Explanation */}
        <p className="text-sm text-gray-700 leading-relaxed">{explanation}</p>

        {/* Elimination list */}
        {!isPlacement && eliminations.length > 0 && (
          <div className="text-xs text-gray-600 bg-orange-50 border border-orange-200 rounded-lg p-3">
            <span className="font-semibold">
              {eliminations.length === 1
                ? `R${eliminations[0]!.row + 1}C${eliminations[0]!.col + 1}: −${eliminations[0]!.digit}`
                : eliminations.map(e => `R${e.row + 1}C${e.col + 1}: −${e.digit}`).join('  ')}
            </span>
          </div>
        )}

        {/* Learn more link (shown only when slug is set; pages to be built later) */}
        {activeHint?.learnMoreSlug && false && (
          <a
            href={`/learn/${activeHint?.learnMoreSlug}`}
            className="text-sm text-blue-600 hover:underline"
          >
            {t('hint.learnMore')}
          </a>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 justify-end pt-1">
          <Button onClick={onDismiss} variant="secondary">
            {t('hint.dismiss')}
          </Button>
          <Button onClick={onApply} variant="primary">
            {t('hint.apply')}
          </Button>
        </div>
      </div>
    </div>
  );
}
