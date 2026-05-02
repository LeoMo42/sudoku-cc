import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SettingsDrawerProps {
  highlightsEnabled: boolean;
  toggleHighlights: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  celebrationEnabled: boolean;
  toggleCelebration: () => void;
  hapticEnabled: boolean;
  toggleHaptic: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  colorBlindMode: boolean;
  toggleColorBlindMode: () => void;
  onTour: () => void;
  onPrint: () => void;
}

interface RowProps {
  icon: string;
  label: string;
  enabled: boolean;
  onToggle: () => void;
  testId?: string;
}

function SettingRow({ icon, label, enabled, onToggle, testId }: RowProps) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={enabled}
      data-testid={testId}
      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <span className="text-lg w-6 text-center" aria-hidden="true">{icon}</span>
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      </div>
      <div
        className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
          enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}

export function SettingsDrawer(props: SettingsDrawerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={t('game.settings')}
        aria-expanded={open}
        data-testid="settings-gear"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-xl leading-none text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg"
      >
        <span aria-hidden="true">⚙️</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-2">
          <SettingRow
            icon={props.highlightsEnabled ? '🔆' : '🔅'}
            label={props.highlightsEnabled ? t('game.highlightsOn') : t('game.highlightsOff')}
            enabled={props.highlightsEnabled}
            onToggle={() => { props.toggleHighlights(); }}
            testId="toggle-highlights"
          />
          <SettingRow
            icon={props.soundEnabled ? '🔊' : '🔇'}
            label={props.soundEnabled ? t('game.soundOn') : t('game.soundOff')}
            enabled={props.soundEnabled}
            onToggle={() => { props.toggleSound(); }}
          />
          <SettingRow
            icon={props.celebrationEnabled ? '🎉' : '🚫'}
            label={props.celebrationEnabled ? t('game.celebrationOn') : t('game.celebrationOff')}
            enabled={props.celebrationEnabled}
            onToggle={() => { props.toggleCelebration(); }}
            testId="toggle-celebration"
          />
          <SettingRow
            icon={props.hapticEnabled ? '📳' : '📴'}
            label={props.hapticEnabled ? t('game.hapticOn') : t('game.hapticOff')}
            enabled={props.hapticEnabled}
            onToggle={() => { props.toggleHaptic(); }}
            testId="toggle-haptic"
          />
          <SettingRow
            icon={props.isDark ? '🌙' : '☀️'}
            label={props.isDark ? t('game.darkModeOn') : t('game.darkModeOff')}
            enabled={props.isDark}
            onToggle={() => { props.toggleTheme(); }}
            testId="toggle-theme"
          />
          <SettingRow
            icon={props.colorBlindMode ? '👁' : '🎨'}
            label={props.colorBlindMode ? t('game.colorBlindOn') : t('game.colorBlindOff')}
            enabled={props.colorBlindMode}
            onToggle={() => { props.toggleColorBlindMode(); }}
            testId="toggle-colorblind"
          />

          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />

          <button
            onClick={() => { props.onTour(); setOpen(false); }}
            data-testid="start-tour"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <span className="text-lg w-6 text-center" aria-hidden="true">🧭</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('game.startTour')}</span>
          </button>
          <button
            onClick={() => { props.onPrint(); setOpen(false); }}
            data-testid="print-button"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <span className="text-lg w-6 text-center" aria-hidden="true">🖨️</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('game.print')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
