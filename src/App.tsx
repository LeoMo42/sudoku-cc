import { GameProvider } from './context/GameContext';
import { GameContainer } from './components/Game/GameContainer';

function App() {
  return (
    <GameProvider>
      <GameContainer />
    </GameProvider>
  );
}

export default App;
