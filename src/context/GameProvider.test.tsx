import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useContext } from 'react';
import { GameProvider, GameContext, isValidSavedState } from './GameContext';
import { STORAGE_KEY } from '../utils/constants';

// Minimal wrapper to access GameContext inside tests — re-renders on every state change
function TestConsumer({ onUpdate }: { onUpdate: (ctx: NonNullable<React.ContextType<typeof GameContext>>) => void }) {
  const ctx = useContext(GameContext);
  React.useEffect(() => {
    if (ctx) onUpdate(ctx);
  });
  return <span data-testid="difficulty">{ctx?.state.difficulty}</span>;
}

function renderProvider() {
  let latestCtx: NonNullable<React.ContextType<typeof GameContext>> | null = null;
  const { getByTestId } = render(
    <GameProvider>
      <TestConsumer onUpdate={(ctx) => { latestCtx = ctx; }} />
    </GameProvider>
  );
  return { getCtx: () => latestCtx!, getByTestId };
}

describe('GameProvider localStorage save/clear', () => {
  // A real 9x9 solution. Fixtures must not use a zero grid here:
  // isValidSavedState rejects empty cells in `solution` (#272/#273), and a
  // rejected save is discarded — which would make these tests pass without
  // ever exercising the load path they exist to cover.
  function solvedGrid(): number[][] {
    return Array(9).fill(null).map((_, r) =>
      Array(9).fill(null).map((_, c) => ((r * 3 + Math.floor(r / 3) + c) % 9) + 1));
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('saves game state when status is PLAYING', async () => {
    const { getCtx } = renderProvider();
    await act(async () => {
      getCtx().actions.newGame('EASY', 'CLASSIC');
    });
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.gameStatus).toBe('playing');
    expect(saved.difficulty).toBe('EASY');
  });

  it('saves state when game is PAUSED', async () => {
    const { getCtx } = renderProvider();
    await act(async () => {
      getCtx().actions.newGame('EASY', 'CLASSIC');
    });
    await act(async () => {
      getCtx().actions.pauseGame();
    });
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.gameStatus).toBe('paused');
  });

  it('restores saved game on remount', async () => {
    // Seed localStorage with a saved PLAYING state
    const board = Array(9).fill(null).map(() => Array(9).fill(0));
    const savedState = {
      board,
      initialBoard: board,
      solution: solvedGrid(),
      difficulty: 'HARD',
      sudokuType: 'CLASSIC',
      gameStatus: 'playing',
      elapsedTime: 42,
      hintsUsed: 0,
      errors: [],
      mistakeCount: 0,
      notesMode: false,
      notes: [],
      activeHint: null,
      oddEvenMarkers: null,
      kropkiDots: null,
      killerCages: null,
      littleKillerClues: null,
      greaterThanSigns: null,
      thermos: null,
      sandwichClues: null,
      version: 1,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));

    const { getCtx, getByTestId } = renderProvider();
    // Wait for the load useEffect to run and re-render
    await act(async () => {});

    expect(getByTestId('difficulty').textContent).toBe('HARD');
    expect(getCtx().state.elapsedTime).toBe(42);
    expect(getCtx().state.gameStatus).toBe('playing');
  });

  it('starting a new game overwrites saved state', async () => {
    const { getCtx } = renderProvider();
    await act(async () => {
      getCtx().actions.newGame('EASY', 'CLASSIC');
    });
    await act(async () => {
      getCtx().actions.newGame('EXPERT', 'DIAGONAL');
    });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.difficulty).toBe('EXPERT');
    expect(saved.sudokuType).toBe('DIAGONAL');
  });

  // The compatibility check that matters (#272). Tightening isValidSavedState
  // is only safe if a save written by THIS build still passes it — otherwise
  // every player loses their in-progress game on the next deploy. Round-trips
  // through the real persist effect rather than a hand-written fixture, and
  // covers a variant so the clue-data requirement is exercised too.
  it.each(['CLASSIC', 'KILLER'])('a %s save written by the app validates and restores', async variant => {
    const { getCtx } = renderProvider();
    await act(async () => {
      getCtx().actions.newGame('EASY', variant as 'CLASSIC', 3);
    });

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(isValidSavedState(JSON.parse(raw!))).toBe(true);

    // And it survives a remount, which is the path a player actually takes.
    const remounted = renderProvider();
    await act(async () => {});
    expect(remounted.getCtx().state.sudokuType).toBe(variant);
    expect(remounted.getCtx().state.gameStatus).toBe('playing');
  }, 30_000);

  function makeTerminalSeed(gameStatus: 'completed' | 'lost') {
    const board = Array(9).fill(null).map(() => Array(9).fill(0));
    return {
      board,
      initialBoard: board,
      solution: solvedGrid(),
      difficulty: 'EASY',
      sudokuType: 'CLASSIC',
      gameStatus,
      elapsedTime: 10,
      hintsUsed: 0,
      errors: [],
      mistakeCount: 0,
      notesMode: false,
      notes: [],
      activeHint: null,
      oddEvenMarkers: null,
      kropkiDots: null,
      killerCages: null,
      littleKillerClues: null,
      greaterThanSigns: null,
      thermos: null,
      sandwichClues: null,
      version: 1,
    };
  }

  it('clears localStorage when a COMPLETED state is loaded', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makeTerminalSeed('completed')));
    renderProvider();
    await act(async () => {});
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clears localStorage when a LOST state is loaded', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makeTerminalSeed('lost')));
    renderProvider();
    await act(async () => {});
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
