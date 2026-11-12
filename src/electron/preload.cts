const electron = require('electron');

// The page only needs to know it runs inside the desktop app, and on which OS
// (recorded as the platform a player signs in from).
electron.contextBridge.exposeInMainWorld('electron', {
    isDesktop: true,
    platform: process.platform,
} satisfies Window['electron']);
