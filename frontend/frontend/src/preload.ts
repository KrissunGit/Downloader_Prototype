import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld('electronAPI', {
    startDownload: (url: string, format: string, quality: string) => ipcRenderer.send("start-download", url, format, quality),
    getLibrary: () => ipcRenderer.invoke("get-library"),
    getSongs: (playlistId: string) => ipcRenderer.invoke('get-songs', playlistId),
    onDownloadStatus: (callback: (status: string) => void) => 
        ipcRenderer.on('download-status', (_event,value) => callback(value)),
    deletePlaylist: (playlistId: string) => ipcRenderer.invoke('delete-playlist', playlistId),
    renamePlaylist: (playlistId: string, newName: string) => ipcRenderer.invoke('rename-playlist', playlistId, newName),
    onDownloadStatusStream: (callback: (update: any) => void) => ipcRenderer.on('download-progress-stream', (event, value) => callback(value))
});