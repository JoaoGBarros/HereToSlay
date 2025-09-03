import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from './login/Login';
import Games from './games/Games';
import Lobby from './games/lobby-page/Lobby';
import InGame from './in-game/InGame';

function App() {

  useEffect(() => {
    if (window.electron && window.electron.subscribeStatistics) {
      const unsub = window.electron.subscribeStatistics((statistics) => {
        console.log(statistics);
      });
      return unsub;
    }
  }, []);


  return (
    <BrowserRouter>
      <div className='application'>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/games" element={<Games />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/in-game" element={<InGame />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
