import { GameOverModal } from './GameOverModal';

export default {
  title: 'Controls/GameOverModal',
  component: GameOverModal,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export const Open = {
  args: {
    open: true,
    limit: 3,
    onNewGame: () => alert('New game'),
  },
};

export const HighLimit = {
  args: {
    open: true,
    limit: 5,
    onNewGame: () => alert('New game'),
  },
};

// Sanity story: open=false should render nothing.
export const Closed = {
  args: {
    open: false,
    limit: 3,
    onNewGame: () => alert('New game'),
  },
};
