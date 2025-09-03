import {app, BrowserWindow, ipcMain, Tray} from 'electron'
import path from 'path'
import { isDev } from './util.js';
import { poolResources } from './resourceManager.js';
import { getAssetsPath, getPreloadPath } from './pathResolver.js';
import { getStaticData } from './resourceManager.js';
import { ipcMainHandle } from './util.js';
import { create } from 'domain';
import { createTray } from './tray.js';

app.on("ready", () => {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: getPreloadPath(),
    },
    frame: false,
    fullscreen: true
  });

  if (isDev()) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), "dist/index.html"));
  }

  poolResources(mainWindow);

  ipcMainHandle('staticData', () => {
    return getStaticData();
  });

  createTray(mainWindow);
  handleCloseEvents(mainWindow);
});

function handleCloseEvents(mainWindow: BrowserWindow) {
  let willClose = false;

  if(willClose){
    return;
  }

  mainWindow.on("close", (e) => {
    if (willClose) {
      return;
    }

    e.preventDefault();
    mainWindow.hide();

    if (app.dock) {
      app.dock.hide();
    }
  });

  app.on("before-quit", () => {
    willClose = true;
  });

  mainWindow.on("show", () => {
    willClose = false;
  });

}
