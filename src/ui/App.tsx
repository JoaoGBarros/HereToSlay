import './App.css'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import Login from './login/Login';
import Games from './games/Games';
import Lobby from './games/lobby-page/Lobby';
import InGame from './in-game/InGame';
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// The desktop app loads index.html from disk, where only hash routes work.
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

function App() {
  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <Router>
          <div className='application'>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/games" element={<Games />} />
              <Route path="/lobby/:id" element={<Lobby />} />
              <Route path="/match/:id" element={<InGame />} />
            </Routes>
          </div>
        </Router>
      </DndProvider>
    </>
  )
}

export default App
