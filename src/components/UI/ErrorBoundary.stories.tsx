import { ErrorBoundary } from './ErrorBoundary';

export default {
  title: 'UI/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

// Component that throws to trigger the boundary
function BrokenComponent(): never {
  throw new Error('Test error for Storybook');
}

export const ErrorStateEn = {
  render: () => {
    localStorage.setItem('language', 'en');
    return (
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );
  },
};

export const ErrorStateRu = {
  render: () => {
    localStorage.setItem('language', 'ru');
    return (
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );
  },
};

export const NoError = {
  render: () => (
    <ErrorBoundary>
      <div className="p-8 text-center text-gray-600">
        App renders normally when there is no error.
      </div>
    </ErrorBoundary>
  ),
};
