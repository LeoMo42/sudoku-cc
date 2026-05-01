import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { RootRedirect } from './components/Routes/RootRedirect';
import { HomePage } from './components/Routes/HomePage';
import { VariantPage } from './components/Routes/VariantPage';

// Vite injects this from --base; '/' in dev, '/sudoku-cc/' on GH Pages.
// Strip the trailing slash — react-router's basename expects no trailing
// slash and adds one back internally.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <GameProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path=":lang" element={<HomePage />} />
            <Route path=":lang/:slug" element={<VariantPage />} />
            {/* Any other path bounces to root, which redirects to the
                user's preferred /{lang} home. */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </GameProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
