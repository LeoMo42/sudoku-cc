import { GameControls } from './GameControls';
import { GAME_STATUS } from '../../utils/constants';

export default {
  title: 'Controls/GameControls',
  component: GameControls,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Playing = {
  args: {
    onNewGame: () => console.log('New game'),
    onCheck: () => console.log('Check solution'),
    onHint: () => console.log('Get hint'),
    onPause: () => console.log('Pause game'),
    onResume: () => console.log('Resume game'),
    onToggleNotes: () => console.log('Toggle notes'),
    hintsUsed: 2,
    maxHints: 10,
    gameStatus: GAME_STATUS.PLAYING,
    notesMode: false,
  },
};

export const PlayingWithNotes = {
  args: {
    onNewGame: () => console.log('New game'),
    onCheck: () => console.log('Check solution'),
    onHint: () => console.log('Get hint'),
    onPause: () => console.log('Pause game'),
    onResume: () => console.log('Resume game'),
    onToggleNotes: () => console.log('Toggle notes'),
    hintsUsed: 1,
    maxHints: 10,
    gameStatus: GAME_STATUS.PLAYING,
    notesMode: true,
  },
};

export const NoHintsLeft = {
  args: {
    onNewGame: () => console.log('New game'),
    onCheck: () => console.log('Check solution'),
    onHint: () => console.log('Get hint'),
    onPause: () => console.log('Pause game'),
    onResume: () => console.log('Resume game'),
    onToggleNotes: () => console.log('Toggle notes'),
    hintsUsed: 10,
    maxHints: 10,
    gameStatus: GAME_STATUS.PLAYING,
    notesMode: false,
  },
};

export const Paused = {
  args: {
    onNewGame: () => console.log('New game'),
    onCheck: () => console.log('Check solution'),
    onHint: () => console.log('Get hint'),
    onPause: () => console.log('Pause game'),
    onResume: () => console.log('Resume game'),
    onToggleNotes: () => console.log('Toggle notes'),
    hintsUsed: 2,
    maxHints: 10,
    gameStatus: GAME_STATUS.PAUSED,
    notesMode: false,
  },
};

export const Completed = {
  args: {
    onNewGame: () => console.log('New game'),
    onCheck: () => console.log('Check solution'),
    onHint: () => console.log('Get hint'),
    onPause: () => console.log('Pause game'),
    onResume: () => console.log('Resume game'),
    onToggleNotes: () => console.log('Toggle notes'),
    hintsUsed: 3,
    maxHints: 10,
    gameStatus: GAME_STATUS.COMPLETED,
    notesMode: false,
  },
};

export const Idle = {
  args: {
    onNewGame: () => console.log('New game'),
    onCheck: () => console.log('Check solution'),
    onHint: () => console.log('Get hint'),
    onPause: () => console.log('Pause game'),
    onResume: () => console.log('Resume game'),
    onToggleNotes: () => console.log('Toggle notes'),
    hintsUsed: 0,
    maxHints: 10,
    gameStatus: GAME_STATUS.IDLE,
    notesMode: false,
  },
};
