export default {
  title: 'Introduction/Welcome',
  parameters: {
    layout: 'centered',
  },
};

export const Welcome = () => (
  <div className="max-w-4xl p-8">
    <h1 className="text-4xl font-bold mb-6">Sudoku Game - Component Library</h1>

    <p className="text-lg mb-4">
      Welcome to the Sudoku game component library! This Storybook showcases all the UI components used in the application.
    </p>

    <h2 className="text-2xl font-bold mt-8 mb-4">🎮 Project Overview</h2>

    <p className="mb-4">This is a full-featured Sudoku game built with React, Vite, and Tailwind CSS. The game includes:</p>

    <ul className="list-disc list-inside mb-6 space-y-2">
      <li>✅ Puzzle generation with unique solutions</li>
      <li>✅ Solution validation</li>
      <li>✅ Hint system (3-5 hints per game)</li>
      <li>✅ Timer</li>
      <li>✅ Four difficulty levels</li>
      <li>✅ Notes mode</li>
      <li>✅ Auto-save to localStorage</li>
      <li>✅ Keyboard navigation</li>
    </ul>

    <h2 className="text-2xl font-bold mt-8 mb-4">📚 Component Categories</h2>

    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold mb-2">UI Components</h3>
        <p className="text-gray-700">Basic reusable UI components: Button, Modal</p>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">Board Components</h3>
        <p className="text-gray-700">Sudoku board and cell components: Cell, Board</p>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">Controls</h3>
        <p className="text-gray-700">Game control components: Timer, NumberPad, DifficultySelector, GameControls</p>
      </div>
    </div>

    <h2 className="text-2xl font-bold mt-8 mb-4">🚀 Getting Started</h2>

    <p className="mb-4">
      Browse the components in the sidebar to see their different states and variations.
    </p>

    <p className="mb-4">Each component story includes:</p>
    <ul className="list-disc list-inside mb-6">
      <li>Interactive controls to modify props</li>
      <li>Multiple variants showcasing different states</li>
      <li>Documentation of props and usage</li>
    </ul>

    <h2 className="text-2xl font-bold mt-8 mb-4">📖 Tech Stack</h2>

    <ul className="list-disc list-inside space-y-1">
      <li><strong>React</strong> - UI library</li>
      <li><strong>Vite</strong> - Build tool</li>
      <li><strong>Tailwind CSS</strong> - Styling</li>
      <li><strong>Storybook</strong> - Component development</li>
      <li><strong>Vitest</strong> - Testing framework</li>
    </ul>
  </div>
);
