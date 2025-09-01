const electron = require('electron');

electron.contextBridge.exposeInMainWorld('electron', {
    subscribeStatistics: (callback) => {
        return ipcOn('statistics', (stats) => {
            callback(stats);
        });
    },
    getStaticData: () => ipcInvoke('staticData'),
} satisfies Window['electron']);


function ipcInvoke<Key extends keyof EventPayload>(key: Key) : Promise<EventPayload[Key]> {
    return electron.ipcRenderer.invoke(key);
}

function ipcOn<Key extends keyof EventPayload>(key: Key, callback: (data: EventPayload[Key]) => void) {
    
    const cb = (_ : Electron.IpcRendererEvent, payload : EventPayload[Key]) => callback(payload);
    electron.ipcRenderer.on(key, cb);
    return  () => electron.ipcRenderer.off(key, cb);
}
