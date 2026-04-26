import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePuzzleLifecycle } from './usePuzzleLifecycle';
import { GAME_STATUS } from '../utils/constants';
import * as stats from '../utils/stats';
import type { GameState, GameActions } from '../types/index';
import type { DailyInfo } from '../utils/dailyPuzzle';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

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

const dailyInfo: DailyInfo = {
  date: '2026-04-27',
  dayNumber: 9613,
  seed: 42,
  type: 'CLASSIC',
  difficulty: 'MEDIUM',
};

describe('usePuzzleLifecycle', () => {
  let confirmSpy: MockInstance<typeof window.confirm>;
  let recordStartSpy: MockInstance<typeof stats.recordGameStart>;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    recordStartSpy = vi.spyOn(stats, 'recordGameStart').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initial state — not playing daily', () => {
    const { result } = renderHook(() =>
      usePuzzleLifecycle({
        state: makeState(),
        actions: makeActions(),
        dailyInfo,
        markDailyCompleted: vi.fn(),
        triggerAutoShow: vi.fn(),
      }),
    );
    expect(result.current.isPlayingDaily).toBe(false);
  });

  it('handleStartDaily flips isPlayingDaily, calls newGame with seed, records start', () => {
    const actions = makeActions();
    const { result } = renderHook(() =>
      usePuzzleLifecycle({
        state: makeState(),
        actions,
        dailyInfo,
        markDailyCompleted: vi.fn(),
        triggerAutoShow: vi.fn(),
      }),
    );

    act(() => result.current.handleStartDaily());

    expect(result.current.isPlayingDaily).toBe(true);
    expect(actions.newGame).toHaveBeenCalledWith('MEDIUM', 'CLASSIC', 42);
    expect(recordStartSpy).toHaveBeenCalledWith('CLASSIC', 'MEDIUM');
  });

  it('handleNewGame skips when user dismisses confirm mid-game', () => {
    confirmSpy.mockReturnValue(false);
    const actions = makeActions();
    const { result } = renderHook(() =>
      usePuzzleLifecycle({
        state: makeState({ gameStatus: GAME_STATUS.PLAYING, historyIndex: 5 }),
        actions,
        dailyInfo,
        markDailyCompleted: vi.fn(),
        triggerAutoShow: vi.fn(),
      }),
    );

    act(() => result.current.handleNewGame());

    expect(actions.newGame).not.toHaveBeenCalled();
    expect(recordStartSpy).not.toHaveBeenCalled();
  });

  it('confirm guard fires for PAUSED state too', () => {
    confirmSpy.mockReturnValue(false);
    const actions = makeActions();
    const { result } = renderHook(() =>
      usePuzzleLifecycle({
        state: makeState({ gameStatus: GAME_STATUS.PAUSED, historyIndex: 3 }),
        actions,
        dailyInfo,
        markDailyCompleted: vi.fn(),
        triggerAutoShow: vi.fn(),
      }),
    );

    act(() => result.current.handleDifficultyChange('HARD'));
    expect(actions.newGame).not.toHaveBeenCalled();
  });

  it('confirm guard does not fire when historyIndex is 0', () => {
    const actions = makeActions();
    const { result } = renderHook(() =>
      usePuzzleLifecycle({
        state: makeState({ gameStatus: GAME_STATUS.PLAYING, historyIndex: 0 }),
        actions,
        dailyInfo,
        markDailyCompleted: vi.fn(),
        triggerAutoShow: vi.fn(),
      }),
    );

    act(() => result.current.handleNewGame());
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(actions.newGame).toHaveBeenCalled();
  });

  it('exit-daily confirm copy: handleNewGame uses confirmExitDaily when daily is in flight', () => {
    confirmSpy.mockReturnValue(true);
    const actions = makeActions();

    const { result, rerender } = renderHook(
      ({ state }: { state: GameState }) =>
        usePuzzleLifecycle({
          state,
          actions,
          dailyInfo,
          markDailyCompleted: vi.fn(),
          triggerAutoShow: vi.fn(),
        }),
      { initialProps: { state: makeState() } },
    );

    // Start a daily — flips ref
    act(() => result.current.handleStartDaily());

    // Now in-progress; rerender with PLAYING + historyIndex>0
    rerender({ state: makeState({ gameStatus: GAME_STATUS.PLAYING, historyIndex: 4 }) });

    act(() => result.current.handleNewGame());
    expect(confirmSpy).toHaveBeenCalledWith('game.confirmExitDaily');
  });

  it('handleStartDaily uses confirmNewGame copy (never confirmExitDaily)', () => {
    confirmSpy.mockReturnValue(true);
    const { result } = renderHook(() =>
      usePuzzleLifecycle({
        state: makeState({ gameStatus: GAME_STATUS.PLAYING, historyIndex: 4 }),
        actions: makeActions(),
        dailyInfo,
        markDailyCompleted: vi.fn(),
        triggerAutoShow: vi.fn(),
      }),
    );

    act(() => result.current.handleStartDaily());
    expect(confirmSpy).toHaveBeenCalledWith('game.confirmNewGame');
  });

  it('handleTypeChange triggers auto-show for the new type', () => {
    const triggerAutoShow = vi.fn();
    const { result } = renderHook(() =>
      usePuzzleLifecycle({
        state: makeState(),
        actions: makeActions(),
        dailyInfo,
        markDailyCompleted: vi.fn(),
        triggerAutoShow,
      }),
    );

    act(() => result.current.handleTypeChange('DIAGONAL'));
    expect(triggerAutoShow).toHaveBeenCalledWith('DIAGONAL');
  });

  it('completion of a daily calls markDailyCompleted with captured date and clears flag', () => {
    const markDailyCompleted = vi.fn();
    const { result, rerender } = renderHook(
      ({ state }: { state: GameState }) =>
        usePuzzleLifecycle({
          state,
          actions: makeActions(),
          dailyInfo,
          markDailyCompleted,
          triggerAutoShow: vi.fn(),
        }),
      { initialProps: { state: makeState() } },
    );

    act(() => result.current.handleStartDaily());
    expect(result.current.isPlayingDaily).toBe(true);

    // Capture date snapshot before midnight rollover
    const startedDate = dailyInfo.date;

    // Simulate completion — gameStatus → COMPLETED
    rerender({ state: makeState({ gameStatus: GAME_STATUS.COMPLETED }) });

    expect(markDailyCompleted).toHaveBeenCalledWith(startedDate);
    expect(result.current.isPlayingDaily).toBe(false);
  });

  it('completion of a non-daily game does NOT call markDailyCompleted', () => {
    const markDailyCompleted = vi.fn();
    const { result, rerender } = renderHook(
      ({ state }: { state: GameState }) =>
        usePuzzleLifecycle({
          state,
          actions: makeActions(),
          dailyInfo,
          markDailyCompleted,
          triggerAutoShow: vi.fn(),
        }),
      { initialProps: { state: makeState({ gameStatus: GAME_STATUS.PLAYING }) } },
    );

    expect(result.current.isPlayingDaily).toBe(false);

    rerender({ state: makeState({ gameStatus: GAME_STATUS.COMPLETED }) });
    expect(markDailyCompleted).not.toHaveBeenCalled();
  });
});
