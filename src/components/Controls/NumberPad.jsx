import { Button } from '../UI/Button';

/**
 * Number pad for inputting values (1-9) and clearing cells
 */
export function NumberPad({ onNumberClick, onClear, disabled }) {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-5 gap-2">
        {numbers.map((num) => (
          <Button
            key={num}
            onClick={() => onNumberClick(num)}
            disabled={disabled}
            variant="secondary"
            className="w-12 h-12 text-lg font-bold"
          >
            {num}
          </Button>
        ))}
        <Button
          onClick={onClear}
          disabled={disabled}
          variant="danger"
          className="w-12 h-12 text-sm"
        >
          Очистить
        </Button>
      </div>
    </div>
  );
}
