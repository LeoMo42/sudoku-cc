import { HintModal } from './HintModal';

export default {
  title: 'Controls/HintModal',
  component: HintModal,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

const noop = () => {};

// ---------------------------------------------------------------------------
// Placement hints
// ---------------------------------------------------------------------------

export const NakedSingleEasy = {
  args: {
    activeHint: {
      technique: 'NAKED_SINGLE',
      difficulty: 'EASY',
      placement: { row: 3, col: 5, value: 7 },
      eliminations: [],
      highlightCells: [
        { row: 3, col: 5, role: 'target' },
        { row: 0, col: 5, role: 'cause' },
        { row: 3, col: 0, role: 'cause' },
      ],
      learnMoreSlug: 'naked-single',
    },
    onApply: noop,
    onDismiss: noop,
  },
};

export const HiddenSingleEasy = {
  args: {
    activeHint: {
      technique: 'HIDDEN_SINGLE',
      difficulty: 'EASY',
      placement: { row: 1, col: 2, value: 4 },
      eliminations: [],
      highlightCells: [
        { row: 1, col: 2, role: 'target' },
        { row: 0, col: 0, role: 'cause' },
        { row: 2, col: 1, role: 'cause' },
      ],
      learnMoreSlug: 'hidden-single',
    },
    onApply: noop,
    onDismiss: noop,
  },
};

// ---------------------------------------------------------------------------
// Elimination hints
// ---------------------------------------------------------------------------

export const LockedCandidatesMedium = {
  args: {
    activeHint: {
      technique: 'LOCKED_CANDIDATES',
      difficulty: 'MEDIUM',
      placement: null,
      eliminations: [
        { row: 0, col: 3, digit: 5 },
        { row: 0, col: 6, digit: 5 },
      ],
      highlightCells: [
        { row: 0, col: 0, role: 'cause' },
        { row: 0, col: 1, role: 'cause' },
        { row: 0, col: 3, role: 'eliminate' },
        { row: 0, col: 6, role: 'eliminate' },
      ],
      learnMoreSlug: 'locked-candidates',
    },
    onApply: noop,
    onDismiss: noop,
  },
};

export const NakedPairMedium = {
  args: {
    activeHint: {
      technique: 'NAKED_PAIR',
      difficulty: 'MEDIUM',
      placement: null,
      eliminations: [
        { row: 2, col: 0, digit: 1 },
        { row: 2, col: 8, digit: 4 },
      ],
      highlightCells: [
        { row: 2, col: 3, role: 'cause' },
        { row: 2, col: 6, role: 'cause' },
        { row: 2, col: 0, role: 'eliminate' },
        { row: 2, col: 8, role: 'eliminate' },
      ],
      learnMoreSlug: 'naked-pair',
    },
    onApply: noop,
    onDismiss: noop,
  },
};

export const XWingHard = {
  args: {
    activeHint: {
      technique: 'X_WING',
      difficulty: 'HARD',
      placement: null,
      eliminations: [
        { row: 2, col: 2, digit: 7 },
        { row: 5, col: 2, digit: 7 },
        { row: 7, col: 6, digit: 7 },
      ],
      highlightCells: [
        { row: 0, col: 2, role: 'cause' },
        { row: 0, col: 6, role: 'cause' },
        { row: 3, col: 2, role: 'cause' },
        { row: 3, col: 6, role: 'cause' },
        { row: 2, col: 2, role: 'eliminate' },
        { row: 5, col: 2, role: 'eliminate' },
        { row: 7, col: 6, role: 'eliminate' },
      ],
      learnMoreSlug: 'x-wing',
    },
    onApply: noop,
    onDismiss: noop,
  },
};

export const SimpleColoringExpert = {
  args: {
    activeHint: {
      technique: 'SIMPLE_COLORING',
      difficulty: 'EXPERT',
      placement: null,
      eliminations: [
        { row: 4, col: 4, digit: 3 },
      ],
      highlightCells: [
        { row: 0, col: 0, role: 'cause' },
        { row: 2, col: 5, role: 'cause' },
        { row: 6, col: 3, role: 'cause' },
        { row: 4, col: 4, role: 'eliminate' },
      ],
      learnMoreSlug: 'simple-coloring',
    },
    onApply: noop,
    onDismiss: noop,
  },
};

// ---------------------------------------------------------------------------
// Chained placement (#270)
//
// The engine reached a Naked Single only by first firing an X-Wing and a
// Naked Pair. The modal has to show both the prerequisite techniques and the
// candidates Apply is about to strike from the player's notes — otherwise the
// player sees an unexplained "single" and silently loses pencil marks.
// ---------------------------------------------------------------------------

export const ChainedPlacement = {
  args: {
    activeHint: {
      technique: 'NAKED_SINGLE',
      difficulty: 'EASY',
      placement: { row: 4, col: 4, value: 7 },
      eliminations: [
        { row: 1, col: 4, digit: 7 },
        { row: 6, col: 4, digit: 7 },
        { row: 4, col: 1, digit: 3 },
      ],
      highlightCells: [
        { row: 4, col: 4, role: 'target' },
        { row: 1, col: 4, role: 'eliminate' },
        { row: 6, col: 4, role: 'eliminate' },
      ],
      learnMoreSlug: 'naked-single',
      chain: ['X_WING', 'NAKED_PAIR', 'NAKED_SINGLE'],
    },
    onApply: noop,
    onDismiss: noop,
  },
};

// ---------------------------------------------------------------------------
// No hint (modal hidden)
// ---------------------------------------------------------------------------

export const NoHint = {
  args: {
    activeHint: null,
    onApply: noop,
    onDismiss: noop,
  },
};
