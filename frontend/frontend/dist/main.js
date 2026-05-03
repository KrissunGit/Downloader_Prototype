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
const child_process_1 = require("child_process");
const util_1 = require("util");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
let cachedLibrary = null;
electron_1.ipcMain.on("download-song", (event, url) => {
    const rootPath = path.join(__dirname, '..', '..');
    const goFilePath = path.join(rootPath, 'downloader.go');
    const cmd = `go run "${goFilePath}" "${url}"`;
    console.log("Executing:", cmd);
    (0, child_process_1.exec)(cmd, (error, stderr, stdout) => {
        if (error) {
            console.error("GO EXEC ERROR:", error); // Look at your terminal for this!
            console.error("GO STDERR:", stderr); // And this!
            event.reply('download-status', 'Error!');
        }
        else {
            cachedLibrary = null;
            console.log("GO STDOUT:", stdout);
            event.reply('download-status', 'Finished!');
        }
    });
});
electron_1.ipcMain.handle('get-library', () => __awaiter(void 0, void 0, void 0, function* () {
    const rootPath = path.join(__dirname, '..', '..');
    const goFilePath = path.join(rootPath, 'downloader.go');
    if (cachedLibrary)
        return cachedLibrary;
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)(`go run "${goFilePath}" --list`, (error, stdout) => {
            if (error)
                reject(error);
            else {
                console.log("GO DATA:", stdout);
                cachedLibrary = JSON.parse(stdout);
                resolve(cachedLibrary);
            }
            ;
        });
    });
}));
electron_1.ipcMain.handle('get-songs', (event, playlistID) => __awaiter(void 0, void 0, void 0, function* () {
    const rootPath = path.join(__dirname, '..', '..');
    const goFilePath = path.join(rootPath, 'downloader.go');
    const cmd = `go run "${goFilePath}" --songs  "${playlistID}"`;
    try {
        const mm = yield import('music-metadata');
        const { stdout } = yield execPromise(cmd);
        const basicSongs = JSON.parse(stdout);
        const enritchedSongs = yield Promise.all(basicSongs.map((song) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            try {
                const musicDir = path.join(__dirname, '..', 'MyMusic');
                const targetFile = song.Filename || song.filename;
                if (!targetFile) {
                    console.error("Song object missing Filename:", song);
                    return song;
                }
                const fullpath = path.isAbsolute(targetFile)
                    ? targetFile
                    : path.join(musicDir, targetFile);
                const metadata = yield mm.parseFile(fullpath);
                const picture = (_a = metadata.common.picture) === null || _a === void 0 ? void 0 : _a[0];
                let thumbData = "";
                if (picture) {
                    const base64Thumb = Buffer.from(picture.data).toString('base64');
                    thumbData = `data:${picture.format};base64,${base64Thumb}`;
                }
                const finalThumb = thumbData && thumbData.length > 0 ? thumbData : song.thumb;
                return Object.assign(Object.assign({}, song), { Name: metadata.common.title || song.Name, Artist: metadata.common.artist || "Unknown Artist", Duration: metadata.format.duration, Thumb: finalThumb, thumb: finalThumb });
            }
            catch (err) {
                console.error(`Metadata extraction failed for: ${song.Filename}`, err);
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
        // 1. Remove protocol prefix AND decode %20 into spaces
        const relativePath = decodeURIComponent(request.url.replace('local-file://', ''));
        try {
            // 2. Build the absolute path to the MyMusic folder
            const musicRoot = path.join(__dirname, '..', 'MyMusic');
            const finalPath = path.normalize(path.join(musicRoot, relativePath));
            console.log("Protocol loading:", finalPath); // Check your VS Code terminal for this!
            callback({ path: finalPath });
        }
        catch (error) {
            console.error('Failed to register protocol', error);
        }
    });
    createWindow();
});
// Quit when all windows are closed, except on macOS.
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
