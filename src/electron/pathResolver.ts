import path from 'path';
import {app} from 'electron';
import { isDev } from './util.js';

export function getPreloadPath() {
    return path.join(app.getAppPath(), isDev() ? '.' : '..', '/dist-electron/preload.cjs');
}

export function getUiPath() {
    return path.join(app.getAppPath(), '/dist-electron/index.html');
}

export function getAssetsPath() {
    return path.join(app.getAppPath(), isDev() ? '.' : '..', '/src/assets');
}