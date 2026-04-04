import { GameProvider } from './context/GameContext';
import { GameContainer } from './components/Game/GameContainer';
import { ErrorBoundary } from './components/UI/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <GameContainer />
      </GameProvider>
    </ErrorBoundary>
  );
}

export default App;
