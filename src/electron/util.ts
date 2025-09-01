import { ipcMain, WebContents, WebFrameMain } from "electron";
import { getUiPath } from "./pathResolver.js";
import {pathToFileURL} from 'url'

export function isDev(): boolean {
    return process.env.NODE_ENV === 'development';
}

export function ipcMainHandle<Key extends keyof EventPayload>(
    key: Key,
    handler: () => EventPayload[Key]
) {
    ipcMain.handle(key, (event) => {
        event.senderFrame!.url == getUiPath();
        handler();
    });
}

export function ipcWebContentsSend<Key extends keyof EventPayload>(
    key: Key,
    webContents: WebContents,
    payload: EventPayload[Key]
) {
    webContents.send(key, payload);
}

export function validateEventFrame(frame: WebFrameMain) {
    if(isDev() && new URL(frame.url).host === "localhost:5123") {
        return;
    }

    if(frame.url != pathToFileURL(getUiPath()).toString()) {
        throw new Error("Invalid frame");
    }
}
