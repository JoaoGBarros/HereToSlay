const electron = require('electron');

// The page only needs to know it runs inside the desktop app.
electron.contextBridge.exposeInMainWorld('electron', {
    isDesktop: true,
} satisfies Window['electron']);
