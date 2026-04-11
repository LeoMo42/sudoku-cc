import { useTranslation } from 'react-i18next';

interface ShareToastProps {
  visible: boolean;
}

/**
 * Transient confirmation toast shown after a successful copy-to-clipboard.
 * Positioning and auto-dismiss are managed by the parent hook.
 */
export function ShareToast({ visible }: ShareToastProps) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg pointer-events-none select-none"
      data-testid="share-toast"
    >
      {t('game.copiedToClipboard')}
    </div>
  );
}
