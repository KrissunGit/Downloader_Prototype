"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    startDownload: (url, format, quality) => electron_1.ipcRenderer.send("start-download", url, format, quality),
    getLibrary: () => electron_1.ipcRenderer.invoke("get-library"),
    getSongs: (playlistId) => electron_1.ipcRenderer.invoke('get-songs', playlistId),
    onDownloadStatus: (callback) => electron_1.ipcRenderer.on('download-status', (_event, value) => callback(value)),
    deletePlaylist: (playlistId) => electron_1.ipcRenderer.invoke('delete-playlist', playlistId),
    renamePlaylist: (playlistId, newName) => electron_1.ipcRenderer.invoke('rename-playlist', playlistId, newName),
    onDownloadStatusStream: (callback) => electron_1.ipcRenderer.on('download-progress-stream', (event, value) => callback(value))
});
