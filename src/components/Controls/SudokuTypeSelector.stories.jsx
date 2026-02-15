import { SudokuTypeSelector } from './SudokuTypeSelector';

export default {
  title: 'Controls/SudokuTypeSelector',
  component: SudokuTypeSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    currentType: 'CLASSIC',
    onTypeChange: (type) => console.log('Type changed to:', type),
    disabled: false,
  },
};

export const DiagonalSelected = {
  args: {
    currentType: 'DIAGONAL',
    onTypeChange: (type) => console.log('Type changed to:', type),
    disabled: false,
  },
};

export const WindokuSelected = {
  args: {
    currentType: 'WINDOKU',
    onTypeChange: (type) => console.log('Type changed to:', type),
    disabled: false,
  },
};

export const AntiKnightSelected = {
  args: {
    currentType: 'ANTI_KNIGHT',
    onTypeChange: (type) => console.log('Type changed to:', type),
    disabled: false,
  },
};

export const OddEvenSelected = {
  args: {
    currentType: 'ODD_EVEN',
    onTypeChange: (type) => console.log('Type changed to:', type),
    disabled: false,
  },
};

export const AntiKingSelected = {
  args: {
    currentType: 'ANTI_KING',
    onTypeChange: (type) => console.log('Type changed to:', type),
    disabled: false,
  },
};

export const Disabled = {
  args: {
    currentType: 'CLASSIC',
    onTypeChange: (type) => console.log('Type changed to:', type),
    disabled: true,
  },
};
