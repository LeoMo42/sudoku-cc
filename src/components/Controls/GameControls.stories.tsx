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

const baseActions = {
  onNewGame: () => console.log('New game'),
  onCheck: () => console.log('Check solution'),
  onHint: () => console.log('Get hint'),
  onUndo: () => console.log('Undo'),
  onRedo: () => console.log('Redo'),
  onPause: () => console.log('Pause game'),
  onResume: () => console.log('Resume game'),
  onToggleNotes: () => console.log('Toggle notes'),
};

export const Playing = {
  args: {
    ...baseActions,
    hintsUsed: 2,
    maxHints: 10,
    gameStatus: GAME_STATUS.PLAYING,
    notesMode: false,
    canUndo: true,
    canRedo: false,
  },
};

export const PlayingWithNotes = {
  args: {
    ...baseActions,
    hintsUsed: 1,
    maxHints: 10,
    gameStatus: GAME_STATUS.PLAYING,
    notesMode: true,
    canUndo: true,
    canRedo: true,
  },
};

export const NoHintsLeft = {
  args: {
    ...baseActions,
    hintsUsed: 10,
    maxHints: 10,
    gameStatus: GAME_STATUS.PLAYING,
    notesMode: false,
    canUndo: true,
    canRedo: false,
  },
};

export const UndoRedoDisabled = {
  args: {
    ...baseActions,
    hintsUsed: 0,
    maxHints: 10,
    gameStatus: GAME_STATUS.PLAYING,
    notesMode: false,
    canUndo: false,
    canRedo: false,
  },
};

export const UndoRedoAvailable = {
  args: {
    ...baseActions,
    hintsUsed: 2,
    maxHints: 10,
    gameStatus: GAME_STATUS.PLAYING,
    notesMode: false,
    canUndo: true,
    canRedo: true,
  },
};

export const Paused = {
  args: {
    ...baseActions,
    hintsUsed: 2,
    maxHints: 10,
    gameStatus: GAME_STATUS.PAUSED,
    notesMode: false,
    canUndo: false,
    canRedo: false,
  },
};

export const Completed = {
  args: {
    ...baseActions,
    hintsUsed: 3,
    maxHints: 10,
    gameStatus: GAME_STATUS.COMPLETED,
    notesMode: false,
    canUndo: false,
    canRedo: false,
  },
};

export const Idle = {
  args: {
    ...baseActions,
    hintsUsed: 0,
    maxHints: 10,
    gameStatus: GAME_STATUS.IDLE,
    notesMode: false,
    canUndo: false,
    canRedo: false,
  },
};
