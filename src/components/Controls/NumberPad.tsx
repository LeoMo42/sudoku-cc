import { useTranslation } from 'react-i18next';
import { Button } from '../UI/Button';

interface NumberPadProps {
  onNumberClick: (num: number) => void;
  onClear: () => void;
  disabled: boolean;
}

/**
 * Number pad for inputting values (1-9) and clearing cells
 */
export function NumberPad({ onNumberClick, onClear, disabled }: NumberPadProps) {
  const { t } = useTranslation();
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="flex flex-col gap-2">
      {/* 3x3 grid for numbers */}
      <div className="grid grid-cols-3 gap-2">
        {numbers.map((num) => (
          <Button
            key={num}
            onClick={() => onNumberClick(num)}
            disabled={disabled}
            variant="secondary"
            className="w-14 h-14 text-lg font-bold"
          >
            {num}
          </Button>
        ))}
      </div>

      {/* Clear button full width */}
      <Button
        onClick={onClear}
        disabled={disabled}
        variant="danger"
        className="w-full h-12"
      >
        {t('game.clear')}
      </Button>
    </div>
  );
}
