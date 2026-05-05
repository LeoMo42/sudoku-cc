import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoStartIdle } from './useAutoStartIdle';
import { GAME_STATUS } from '../utils/constants';
import * as stats from '../utils/stats';
import type { GameState, GameActions, SudokuTypeId } from '../types/index';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    board: [],
    initialBoard: [],
    solution: [],
    selectedCell: null,
    difficulty: 'EASY',
    sudokuType: 'CLASSIC',
    gameStatus: GAME_STATUS.IDLE,
    elapsedTime: 0,
    hintsUsed: 0,
    errors: new Set(),
    mistakeCount: 0,
    notesMode: false,
    notes: new Map(),
    activeHint: null,
    oddEvenMarkers: null,
    kropkiDots: null,
    killerCages: null,
    littleKillerClues: null,
    greaterThanSigns: null,
    thermos: null,
    sandwichClues: null,
    history: [],
    historyIndex: 0,
    ...overrides,
  } as GameState;
}

function makeActions(): GameActions {
  return {
    newGame: vi.fn(),
    setCellValue: vi.fn(),
    selectCell: vi.fn(),
    checkSolution: vi.fn(),
    getHint: vi.fn(),
    applyHint: vi.fn(),
    dismissHint: vi.fn(),
    toggleNotesMode: vi.fn(),
    setNote: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    pauseGame: vi.fn(),
    resumeGame: vi.fn(),
    updateTime: vi.fn(),
  } as GameActions;
}

describe('useAutoStartIdle', () => {
  beforeEach(() => {
    vi.spyOn(stats, 'recordGameStart').mockImplementation(() => {});
    // Clean URL between tests
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('IDLE on mount', () => {
    it('forcedVariant takes priority over query and state', () => {
      window.history.replaceState({}, '', '/?type=KILLER&difficulty=HARD');
      const actions = makeActions();
      renderHook(() =>
        useAutoStartIdle(makeState(), actions, { forcedVariant: 'WINDOKU' }),
      );
      expect(actions.newGame).toHaveBeenCalledWith('HARD', 'WINDOKU');
    });

    it('falls back to query params when no forcedVariant', () => {
      window.history.replaceState({}, '', '/?type=KILLER&difficulty=HARD');
      const actions = makeActions();
      renderHook(() => useAutoStartIdle(makeState(), actions));
      expect(actions.newGame).toHaveBeenCalledWith('HARD', 'KILLER');
    });

    it('falls back to state when neither forcedVariant nor query', () => {
      const actions = makeActions();
      renderHook(() =>
        useAutoStartIdle(
          makeState({ sudokuType: 'DIAGONAL', difficulty: 'EXPERT' }),
          actions,
        ),
      );
      expect(actions.newGame).toHaveBeenCalledWith('EXPERT', 'DIAGONAL');
    });

    it('ignores invalid query params', () => {
      window.history.replaceState({}, '', '/?type=NONSENSE&difficulty=BOGUS');
      const actions = makeActions();
      renderHook(() => useAutoStartIdle(makeState({ sudokuType: 'CLASSIC' }), actions));
      expect(actions.newGame).toHaveBeenCalledWith('EASY', 'CLASSIC');
    });
  });

  describe('mid-game on mount', () => {
    it('records game-start when status is PLAYING and no variant mismatch', () => {
      const recordSpy = vi.spyOn(stats, 'recordGameStart');
      const actions = makeActions();
      renderHook(() =>
        useAutoStartIdle(
          makeState({ gameStatus: GAME_STATUS.PLAYING, sudokuType: 'KILLER' }),
          actions,
          { forcedVariant: 'KILLER' },
        ),
      );
      expect(actions.newGame).not.toHaveBeenCalled();
      expect(recordSpy).toHaveBeenCalledWith('KILLER', 'EASY');
    });

    it('force-restarts when forcedVariant differs from in-flight variant', () => {
      const actions = makeActions();
      renderHook(() =>
        useAutoStartIdle(
          makeState({ gameStatus: GAME_STATUS.PLAYING, sudokuType: 'CLASSIC' }),
          actions,
          { forcedVariant: 'KILLER' },
        ),
      );
      expect(actions.newGame).toHaveBeenCalledWith('EASY', 'KILLER');
    });

    it('does NOT restart on PLAYING when forcedVariant matches state', () => {
      const actions = makeActions();
      renderHook(() =>
        useAutoStartIdle(
          makeState({ gameStatus: GAME_STATUS.PLAYING, sudokuType: 'WINDOKU' }),
          actions,
          { forcedVariant: 'WINDOKU' },
        ),
      );
      expect(actions.newGame).not.toHaveBeenCalled();
    });

    it('treats PAUSED the same as PLAYING for variantMismatch', () => {
      const actions = makeActions();
      renderHook(() =>
        useAutoStartIdle(
          makeState({ gameStatus: GAME_STATUS.PAUSED, sudokuType: 'CLASSIC' }),
          actions,
          { forcedVariant: 'THERMO' },
        ),
      );
      expect(actions.newGame).toHaveBeenCalledWith('EASY', 'THERMO');
    });

    it('skips recording for COMPLETED/LOST states', () => {
      const recordSpy = vi.spyOn(stats, 'recordGameStart');
      const actions = makeActions();
      renderHook(() =>
        useAutoStartIdle(
          makeState({ gameStatus: GAME_STATUS.COMPLETED }),
          actions,
        ),
      );
      expect(actions.newGame).not.toHaveBeenCalled();
      expect(recordSpy).not.toHaveBeenCalled();
    });
  });

  // Regression #223 bug 1 — GameProvider stays mounted as the user
  // navigates between /{lang}/{slug} routes, so the URL/<title>/landing
  // copy update but the BOARD stays on the previous variant. The
  // forcedVariant-change effect closes that gap.
  describe('forcedVariant change post-mount', () => {
    it('starts a new game when forcedVariant changes mid-session', () => {
      const recordSpy = vi.spyOn(stats, 'recordGameStart');
      const actions = makeActions();
      const state = makeState({ gameStatus: GAME_STATUS.PLAYING, sudokuType: 'KILLER' });
      const { rerender } = renderHook(
        ({ forcedVariant }: { forcedVariant: SudokuTypeId }) =>
          useAutoStartIdle(state, actions, { forcedVariant }),
        { initialProps: { forcedVariant: 'KILLER' satisfies SudokuTypeId } },
      );
      // Mount: forcedVariant matches state, no auto-start.
      expect(actions.newGame).not.toHaveBeenCalled();
      recordSpy.mockClear();

      rerender({ forcedVariant: 'THERMO' });
      expect(actions.newGame).toHaveBeenCalledWith('EASY', 'THERMO');
      expect(recordSpy).toHaveBeenCalledWith('THERMO', 'EASY');
    });

    it('does NOT re-fire on first render', () => {
      const actions = makeActions();
      renderHook(() =>
        useAutoStartIdle(
          makeState({ gameStatus: GAME_STATUS.PLAYING, sudokuType: 'KILLER' }),
          actions,
          { forcedVariant: 'KILLER' },
        ),
      );
      // Only the mount effect runs; the forcedVariant-change effect is
      // skipped on first render via the hasMountedRef guard.
      expect(actions.newGame).not.toHaveBeenCalled();
    });

    it('ignores no-op forcedVariant changes (same variant, same string)', () => {
      const actions = makeActions();
      const state = makeState({ gameStatus: GAME_STATUS.PLAYING, sudokuType: 'KILLER' });
      const { rerender } = renderHook(
        ({ forcedVariant }: { forcedVariant: SudokuTypeId }) =>
          useAutoStartIdle(state, actions, { forcedVariant }),
        { initialProps: { forcedVariant: 'KILLER' satisfies SudokuTypeId } },
      );
      rerender({ forcedVariant: 'KILLER' });
      expect(actions.newGame).not.toHaveBeenCalled();
    });
  });
});
