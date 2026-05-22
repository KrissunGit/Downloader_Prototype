"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
const execFilePromise = (0, util_1.promisify)(child_process_1.execFile);
let cachedLibrary = null;
electron_1.ipcMain.handle('rename-playlist', (event, playlistID, newName) => __awaiter(void 0, void 0, void 0, function* () {
    const rootPath = path.join(__dirname, '..', '..');
    const goFilePath = path.join(rootPath, 'downloader.go');
    try {
        yield execFilePromise('go', ['run', goFilePath, '--rename-playlist', playlistID, newName]);
        cachedLibrary = null;
        const windows = electron_1.BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            windows[0].webContents.send('playlist-renamed', { playlistID, newName });
        }
        return true;
    }
    catch (err) {
        console.error("GO EXEC ERROR:", err);
        throw err;
    }
}));
electron_1.ipcMain.handle("delete-playlist", (event, playlistID) => __awaiter(void 0, void 0, void 0, function* () {
    const rootPath = path.join(__dirname, '..', '..');
    const goFilePath = path.join(rootPath, 'downloader.go');
    try {
        yield execFilePromise('go', ['run', goFilePath, '--delete-playlist', playlistID]);
        cachedLibrary = null;
        const windows = electron_1.BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            windows[0].webContents.send('playlist-deleted', playlistID);
        }
        return true;
    }
    catch (err) {
        console.error("GO EXEC ERROR:", err);
        throw err;
    }
}));
electron_1.ipcMain.on("start-download", (event, url, format, quality) => {
    const rootPath = path.join(__dirname, '..', '..');
    const goFilePath = path.join(rootPath, 'downloader.go');
    const allowedFormats = ['mp3', 'webm'];
    const fmt = (format || '').toLowerCase();
    if (!allowedFormats.includes(fmt)) {
        const windows = electron_1.BrowserWindow.getAllWindows();
        if (windows.length > 0)
            windows[0].webContents.send('download-status', `Error: unsupported format '${format}'. Allowed: mp3, webm`);
        return;
    }
    const isVideo = fmt === 'webm';
    console.log("Spawning real-time Go worker tracking:", url);
    let args = ['run', goFilePath];
    if (fmt) {
        args.push('--format', fmt);
    }
    if (isVideo) {
        
        const targetQuality = quality ? quality.toString() : '1080p';
        args.push('--video', targetQuality);
    }
    args.push(url);
    console.log("Spawning Go with args:", args);
    const goApp = (0, child_process_1.spawn)('go', args);
    let stderrData = "";
    goApp.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine)
                continue;
            console.log("GO STREAM STDOUT:", cleanLine);
            if (cleanLine.startsWith('{') && cleanLine.endsWith('}')) {
                try {
                    const statusUpdate = JSON.parse(cleanLine);
                    const windows = electron_1.BrowserWindow.getAllWindows();
                    if (windows.length > 0) {
                        windows[0].webContents.send('download-progress-stream', statusUpdate);
                    }
                }
                catch (e) {
                    console.error("Failed to parse Go JSON stream:", e, "Raw line:", cleanLine);
                }
            }
        }
    });
    goApp.stderr.on('data', (data) => {
        stderrData += data.toString();
        console.error("GO STREAM STDERR:", data.toString());
    });
    goApp.on('close', (code) => {
        console.log(`Go worker process exited with code ${code}`);
        const windows = electron_1.BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            if (code === 0) {
                windows[0].webContents.send('download-status', 'Finished!');
            }
            else {
                windows[0].webContents.send('download-status', `Error occurred (Exit Code ${code})`);
            }
        }
    });
});
electron_1.ipcMain.handle('get-library', () => __awaiter(void 0, void 0, void 0, function* () {
    const rootPath = path.join(__dirname, '..', '..');
    const goFilePath = path.join(rootPath, 'downloader.go');
    if (cachedLibrary)
        return cachedLibrary;
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)('go', ['run', goFilePath, '--list'], (error, stdout) => {
            if (error)
                reject(error);
            else {
                console.log("GO DATA:", stdout);
                cachedLibrary = JSON.parse(stdout);
                resolve(cachedLibrary);
            }
        });
    });
}));
electron_1.ipcMain.handle('get-songs', (event, playlistID) => __awaiter(void 0, void 0, void 0, function* () {
    const rootPath = path.join(__dirname, '..', '..');
    const goFilePath = path.join(rootPath, 'downloader.go');
    try {
        const mm = yield import('music-metadata');
        const { stdout } = yield execFilePromise('go', ['run', goFilePath, '--songs', playlistID]);
        const basicSongs = JSON.parse(stdout);
        
        const enritchedSongs = yield Promise.all(basicSongs.map((song) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                const targetFile = song.Filename || song.filename || "";
                const baseAppRoot = path.join(__dirname, '..');
                let fullpath;
                if (path.isAbsolute(targetFile)) {
                    fullpath = targetFile;
                }
                else if (targetFile.startsWith('MyVideos') || targetFile.startsWith('MyVideo') || targetFile.startsWith('MyMusic')) {
                    fullpath = path.join(baseAppRoot, targetFile);
                }
                else {
                    fullpath = path.join(baseAppRoot, 'MyMusic', targetFile);
                }
                let metadata = null;
                try {
                    metadata = yield mm.parseFile(fullpath);
                }
                catch (e) {
                    console.log("Skipping audio ID3 tags extraction for video asset container.");
                }
                const picture = (_b = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.common) === null || _a === void 0 ? void 0 : _a.picture) === null || _b === void 0 ? void 0 : _b[0];
                let thumbData = "";
                if (picture) {
                    const base64Thumb = Buffer.from(picture.data).toString('base64');
                    thumbData = `data:${picture.format};base64,${base64Thumb}`;
                }
                return Object.assign(Object.assign({}, song), { Name: ((_c = metadata === null || metadata === void 0 ? void 0 : metadata.common) === null || _c === void 0 ? void 0 : _c.title) || song.Name || song.name, Artist: ((_d = metadata === null || metadata === void 0 ? void 0 : metadata.common) === null || _d === void 0 ? void 0 : _d.artist) || "Unknown Artist", Duration: ((_e = metadata === null || metadata === void 0 ? void 0 : metadata.format) === null || _e === void 0 ? void 0 : _e.duration) || 0, Thumb: thumbData || song.thumb || 'default-cover.jpg' });
            }
            catch (err) {
                return song;
            }
        })));
        return enritchedSongs;
    }
    catch (err) {
        console.error("GO EXEC ERROR:", err);
        throw err;
    }
}));
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    win.loadFile('index.html');
}
electron_1.app.whenReady().then(() => {
    electron_1.protocol.registerFileProtocol('local-file', (request, callback) => {
        let relativePath = decodeURIComponent(request.url.replace(/^local-file:\/\//i, ''));
        if (process.platform === 'win32') {
            const windowsDrive = relativePath.match(/^\/([A-Za-z]:[\\/].*)$/);
            if (windowsDrive) {
                relativePath = windowsDrive[1];
            }
        }
        relativePath = relativePath.replace(/\\/g, path.sep).replace(/\//g, path.sep);
        try {
            const nestedRoot = path.join(__dirname, '..');
            const outerRoot = path.join(__dirname, '..', '..');
            let finalPath = null;
            const candidates = [
                path.join(nestedRoot, relativePath),
                path.join(outerRoot, relativePath),
                path.join(nestedRoot, 'MyMusic', relativePath),
                path.join(outerRoot, 'MyMusic', relativePath),
            ];
            for (const candidate of candidates) {
                if (fs.existsSync(candidate)) {
                    finalPath = path.normalize(candidate);
                    break;
                }
            }
            if (!finalPath) {
                finalPath = path.normalize(candidates[0]);
            }
            console.log("PROTOCOL RESOLVED ABSOLUTE PATH:", finalPath);
            callback({ path: finalPath });
        }
        catch (error) {
            console.error('Failed to register protocol', error);
        }
    });
    createWindow();
});
