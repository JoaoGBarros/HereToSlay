import { BrowserWindow, Menu, Tray, app } from "electron";
import path from 'path'
import { getAssetsPath } from "./pathResolver.js";

export function createTray(mainWindow: BrowserWindow) {
    const tray = new Tray(path.join(getAssetsPath(), 'icon.png'));

    tray.setContextMenu(Menu.buildFromTemplate([{
        label: 'Quit',
        click: () => {
            app.quit();
        }

        
    }]));
}