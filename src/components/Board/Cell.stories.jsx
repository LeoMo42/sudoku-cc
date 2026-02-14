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
