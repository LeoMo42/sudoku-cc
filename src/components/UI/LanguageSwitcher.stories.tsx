import { LanguageSwitcher } from './LanguageSwitcher';

export default {
  title: 'UI/LanguageSwitcher',
  component: LanguageSwitcher,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {},
};

export const InHeader = () => (
  <div className="bg-gray-100 p-4 rounded-lg">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">Sudoku</h1>
      <LanguageSwitcher />
    </div>
  </div>
);
