import { NumberPad } from './NumberPad';

export default {
  title: 'Controls/NumberPad',
  component: NumberPad,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    onNumberClick: (num) => console.log(`Number ${num} clicked`),
    onClear: () => console.log('Clear clicked'),
    disabled: false,
  },
};

export const Disabled = {
  args: {
    onNumberClick: (num) => console.log(`Number ${num} clicked`),
    onClear: () => console.log('Clear clicked'),
    disabled: true,
  },
};
