import { app, BrowserWindow, shell } from 'electron';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

/** The window opens at the design size and grows to fill the screen; F11 toggles fullscreen. */
function createWindow() {
    const window = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 640,
        show: false,
        backgroundColor: '#0d1315',
        autoHideMenuBar: true,
        icon: path.join(app.getAppPath(), 'dist', 'icon.png'),
        webPreferences: {
            preload: path.join(app.getAppPath(), 'dist-electron', 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    window.once('ready-to-show', () => {
        window.maximize();
        window.show();
    });

    window.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.key === 'F11') {
            window.setFullScreen(!window.isFullScreen());
            event.preventDefault();
        }
    });

    // Links to other sites open in the player's browser, never inside the game window.
    window.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://')) void shell.openExternal(url);
        return { action: 'deny' };
    });

    if (isDev) {
        void window.loadURL('http://localhost:5173');
    } else {
        void window.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
