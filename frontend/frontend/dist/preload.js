"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    downloadSong: (url) => electron_1.ipcRenderer.send("download-song", url),
    getLibrary: () => electron_1.ipcRenderer.invoke("get-library"),
    getSongs: (playlistId) => electron_1.ipcRenderer.invoke('get-songs', playlistId),
    onDownloadStatus: (callback) => electron_1.ipcRenderer.on('download-status', (_event, value) => callback(value))
});
