import { Timer } from './Timer';

export default {
  title: 'Controls/Timer',
  component: Timer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const ZeroTime = {
  args: {
    elapsedTime: 0,
  },
};

export const OneMinute = {
  args: {
    elapsedTime: 60,
  },
};

export const FiveMinutes = {
  args: {
    elapsedTime: 300,
  },
};

export const TenMinutes = {
  args: {
    elapsedTime: 600,
  },
};

export const OneHour = {
  args: {
    elapsedTime: 3600,
  },
};

export const VariousTimes = () => (
  <div className="flex flex-col gap-4">
    <div>
      <p className="text-sm text-gray-600 mb-1">0 seconds</p>
      <Timer elapsedTime={0} />
    </div>
    <div>
      <p className="text-sm text-gray-600 mb-1">30 seconds</p>
      <Timer elapsedTime={30} />
    </div>
    <div>
      <p className="text-sm text-gray-600 mb-1">2 minutes 45 seconds</p>
      <Timer elapsedTime={165} />
    </div>
    <div>
      <p className="text-sm text-gray-600 mb-1">15 minutes 30 seconds</p>
      <Timer elapsedTime={930} />
    </div>
  </div>
);
