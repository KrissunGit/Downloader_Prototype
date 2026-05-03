import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld('electronAPI', {
    downloadSong: (url: string) => ipcRenderer.send("download-song", url),
    getLibrary: () => ipcRenderer.invoke("get-library"),
    getSongs: (playlistId: string) => ipcRenderer.invoke('get-songs', playlistId),
    onDownloadStatus: (callback: (status: string) => void) => 
        ipcRenderer.on('download-status', (_event,value) => callback(value))
});