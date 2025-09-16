import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from './login/Login';
import Games from './games/Games';
import Lobby from './games/lobby-page/Lobby';
import InGame from './in-game/InGame';
import { HeroUIProvider, ToastProvider } from '@heroui/react';
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

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
    <>
      <DndProvider backend={HTML5Backend}>
        <BrowserRouter>
          <div className='application'>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/games" element={<Games />} />
              <Route path="/lobby/:id" element={<Lobby />} />
              <Route path="/match/:id" element={<InGame />} />
            </Routes>
          </div>
        </BrowserRouter>
      </DndProvider>
    </>
  )
}

export default App
