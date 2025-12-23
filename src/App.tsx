import { GameScene } from './components/GameScene'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ErrorBoundary>
        <GameScene />
      </ErrorBoundary>
    </div>
  )
}

export default App
