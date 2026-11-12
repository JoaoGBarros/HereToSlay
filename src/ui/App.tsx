import './App.css'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import Login from './login/Login';
import Games from './games/Games';
import Lobby from './games/lobby-page/Lobby';
import InGame from './in-game/InGame';
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import RequireAuth from './login/RequireAuth';

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
              <Route path="/games" element={<RequireAuth><Games /></RequireAuth>} />
              <Route path="/lobby/:id" element={<RequireAuth><Lobby /></RequireAuth>} />
              <Route path="/match/:id" element={<RequireAuth><InGame /></RequireAuth>} />
            </Routes>
          </div>
        </Router>
      </DndProvider>
    </>
  )
}

export default App
