import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const messages = {
  en: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please reload the page.',
    reload: 'Reload',
  },
  ru: {
    title: 'Что-то пошло не так',
    description: 'Произошла непредвиденная ошибка. Пожалуйста, перезагрузите страницу.',
    reload: 'Перезагрузить',
  },
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('language')) || 'ru';
      const t = lang === 'ru' ? messages.ru : messages.en;

      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t.title}
            </h1>
            <p className="text-gray-600 mb-6">
              {t.description}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              {t.reload}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
