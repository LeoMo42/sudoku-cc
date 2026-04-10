import { Cell } from './Cell';

export default {
  title: 'Board/Cell',
  component: Cell,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '50px', height: '50px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Empty = {
  args: {
    value: 0,
    row: 0,
    col: 0,
    isInitial: false,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    onClick: () => console.log('Cell clicked'),
  },
};

export const FilledInitial = {
  args: {
    value: 5,
    row: 0,
    col: 0,
    isInitial: true,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    onClick: () => console.log('Cell clicked'),
  },
};

export const FilledUser = {
  args: {
    value: 7,
    row: 0,
    col: 0,
    isInitial: false,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    onClick: () => console.log('Cell clicked'),
  },
};

export const Selected = {
  args: {
    value: 0,
    row: 0,
    col: 0,
    isInitial: false,
    isSelected: true,
    isHighlighted: false,
    isError: false,
    onClick: () => console.log('Cell clicked'),
  },
};

export const Highlighted = {
  args: {
    value: 3,
    row: 0,
    col: 0,
    isInitial: false,
    isSelected: false,
    isHighlighted: true,
    isError: false,
    onClick: () => console.log('Cell clicked'),
  },
};

export const MatchingValue = {
  args: {
    value: 5,
    row: 0,
    col: 0,
    isInitial: false,
    isSelected: false,
    // isHighlighted is intentionally false: the matching-value branch
    // sits above the highlighted branch in Cell's else-if chain, so
    // setting both would let one silently mask the other in this story.
    isHighlighted: false,
    isMatchingValue: true,
    isError: false,
    onClick: () => console.log('Cell clicked'),
  },
};

export const MatchingValueInitial = {
  args: {
    value: 5,
    row: 0,
    col: 0,
    isInitial: true,
    isSelected: false,
    isHighlighted: false,
    isMatchingValue: true,
    isError: false,
    onClick: () => console.log('Cell clicked'),
  },
};

export const Error = {
  args: {
    value: 5,
    row: 0,
    col: 0,
    isInitial: false,
    isSelected: false,
    isHighlighted: false,
    isError: true,
    onClick: () => console.log('Cell clicked'),
  },
};

export const WithNotes = {
  args: {
    value: 0,
    row: 0,
    col: 0,
    isInitial: false,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    notes: new Set([1, 2, 5, 7, 9]),
    onClick: () => console.log('Cell clicked'),
  },
};

export const DiagonalCell = {
  args: {
    value: 5,
    row: 0,
    col: 0,
    isInitial: true,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    isOnDiagonal: true,
    onClick: () => console.log('Cell clicked'),
  },
};

export const WindowCell = {
  args: {
    value: 7,
    row: 1,
    col: 1,
    isInitial: true,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    isInWindow: true,
    onClick: () => console.log('Cell clicked'),
  },
};

export const OddMarkerCell = {
  args: {
    value: 0,
    row: 2,
    col: 2,
    isInitial: false,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    oddEvenMarker: 'odd',
    onClick: () => console.log('Cell clicked'),
  },
};

export const EvenMarkerCell = {
  args: {
    value: 0,
    row: 3,
    col: 3,
    isInitial: false,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    oddEvenMarker: 'even',
    onClick: () => console.log('Cell clicked'),
  },
};

export const KropkiWhiteDot = {
  args: {
    value: 4,
    row: 4,
    col: 4,
    isInitial: true,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    rightDot: 'white',
    onClick: () => console.log('Cell clicked'),
  },
};

export const KropkiBlackDot = {
  args: {
    value: 3,
    row: 4,
    col: 4,
    isInitial: true,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    bottomDot: 'black',
    onClick: () => console.log('Cell clicked'),
  },
};

export const GreaterThanRight = {
  args: {
    value: 7,
    row: 4,
    col: 4,
    isInitial: true,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    rightSign: '>',
    onClick: () => console.log('Cell clicked'),
  },
};

export const GreaterThanBottom = {
  args: {
    value: 2,
    row: 4,
    col: 4,
    isInitial: true,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    bottomSign: '<',
    onClick: () => console.log('Cell clicked'),
  },
};

export const ThermoBulb = {
  args: {
    value: 0,
    row: 4,
    col: 4,
    isInitial: false,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    thermoCell: { isBulb: true, dirs: ['right'] },
    onClick: () => console.log('Cell clicked'),
  },
};

export const ThermoMid = {
  args: {
    value: 0,
    row: 4,
    col: 4,
    isInitial: false,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    thermoCell: { isBulb: false, dirs: ['left', 'right'] },
    onClick: () => console.log('Cell clicked'),
  },
};

export const KillerCageTopLeft = {
  args: {
    value: 0,
    row: 4,
    col: 4,
    isInitial: false,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    cageSum: 15,
    cageTop: true,
    cageRight: false,
    cageBottom: false,
    cageLeft: true,
    onClick: () => console.log('Cell clicked'),
  },
};

export const HintTarget = {
  args: {
    value: 5,
    row: 4,
    col: 4,
    isInitial: false,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    hintRole: 'target',
    onClick: () => console.log('Cell clicked'),
  },
};

export const HintCause = {
  args: {
    value: 3,
    row: 4,
    col: 4,
    isInitial: true,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    hintRole: 'cause',
    onClick: () => console.log('Cell clicked'),
  },
};

export const HintEliminate = {
  args: {
    value: 0,
    row: 4,
    col: 4,
    isInitial: false,
    isSelected: false,
    isHighlighted: false,
    isError: false,
    notes: new Set([1, 4]),
    hintRole: 'eliminate',
    onClick: () => console.log('Cell clicked'),
  },
};

export const AllStates = () => (
  <div className="grid grid-cols-4 gap-4">
    <div style={{ width: '50px', height: '50px' }}>
      <Cell
        value={0}
        row={0}
        col={0}
        isInitial={false}
        isSelected={false}
        isHighlighted={false}
        isError={false}
        onClick={() => {}}
      />
      <p className="text-xs mt-1">Empty</p>
    </div>
    <div style={{ width: '50px', height: '50px' }}>
      <Cell
        value={5}
        row={0}
        col={0}
        isInitial={true}
        isSelected={false}
        isHighlighted={false}
        isError={false}
        onClick={() => {}}
      />
      <p className="text-xs mt-1">Initial</p>
    </div>
    <div style={{ width: '50px', height: '50px' }}>
      <Cell
        value={7}
        row={0}
        col={0}
        isInitial={false}
        isSelected={true}
        isHighlighted={false}
        isError={false}
        onClick={() => {}}
      />
      <p className="text-xs mt-1">Selected</p>
    </div>
    <div style={{ width: '50px', height: '50px' }}>
      <Cell
        value={3}
        row={0}
        col={0}
        isInitial={false}
        isSelected={false}
        isHighlighted={false}
        isError={true}
        onClick={() => {}}
      />
      <p className="text-xs mt-1">Error</p>
    </div>
  </div>
);
