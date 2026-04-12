import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface TourStep {
  targetSelector: string;
  titleKey: string;
  bodyKey: string;
}

const STEPS: TourStep[] = [
  { targetSelector: '[data-tour="board"]',               titleKey: 'tour.step1.title', bodyKey: 'tour.step1.body' },
  { targetSelector: '[data-tour="numberpad"]',           titleKey: 'tour.step2.title', bodyKey: 'tour.step2.body' },
  { targetSelector: '[data-tour="game-controls"]',       titleKey: 'tour.step3.title', bodyKey: 'tour.step3.body' },
  { targetSelector: '[data-tour="type-selector"]',       titleKey: 'tour.step4.title', bodyKey: 'tour.step4.body' },
  { targetSelector: '[data-tour="difficulty-selector"]', titleKey: 'tour.step5.title', bodyKey: 'tour.step5.body' },
];

const PADDING = 8;

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  onClose: () => void;
}

export function OnboardingTour({ onClose }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const currentStep = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  // Focus the "Next" button on mount; restore focus on unmount
  useEffect(() => {
    triggerRef.current = document.activeElement;
    nextButtonRef.current?.focus();
    return () => {
      (triggerRef.current as HTMLElement | null)?.focus();
    };
  }, []);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onClose]);

  const measureTarget = useCallback((selector: string) => {
    const el = document.querySelector(selector);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - PADDING,
      left: r.left - PADDING,
      width: r.width + PADDING * 2,
      height: r.height + PADDING * 2,
    });
  }, []);

  // Scroll into view only when step changes; measure only on resize
  useEffect(() => {
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    measureTarget(currentStep.targetSelector);
    nextButtonRef.current?.focus();
  }, [step, currentStep.targetSelector, measureTarget]);

  useEffect(() => {
    const handler = () => measureTarget(currentStep.targetSelector);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [currentStep.targetSelector, measureTarget]);

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('tour.ariaLabel')}
      className="fixed inset-0 z-50"
    >
      {/* Full-screen click-capture overlay (blocks game interaction) */}
      <div className="absolute inset-0 pointer-events-auto" aria-hidden="true">
        {/* Spotlight cutout using box-shadow */}
        {rect && (
          <div
            className="absolute pointer-events-none"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              borderRadius: 8,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
            }}
          />
        )}
        {/* Fallback full overlay when target not found */}
        {!rect && (
          <div className="absolute inset-0 bg-black/65" />
        )}
      </div>

      {/* Tooltip card — fixed at bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5 z-10">
        {/* Step dots */}
        <div className="flex items-center gap-1.5 mb-3" aria-hidden="true">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? 'w-4 bg-blue-500'
                  : i < step
                  ? 'w-1.5 bg-blue-300 dark:bg-blue-600'
                  : 'w-1.5 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t(currentStep.titleKey)}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t(currentStep.bodyKey)}
        </p>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {t('tour.skip')}
          </button>
          <button
            ref={nextButtonRef}
            onClick={handleNext}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isLast ? t('tour.done') : t('tour.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
