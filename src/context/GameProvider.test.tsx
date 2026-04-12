import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useContext } from 'react';
import { GameProvider, GameContext, Actions } from './GameContext';
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
      solution: board,
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
});
