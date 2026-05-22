import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import {exec, execFile, spawn} from 'child_process';
import { error } from 'console';
import {promisify} from 'util';
const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);
let cachedLibrary: any = null;

ipcMain.handle('rename-playlist', async (event, playlistID, newName) => {
  const rootPath = path.join(__dirname, '..', '..');
  const goFilePath = path.join(rootPath, 'downloader.go');
  try {
    await execFilePromise('go', ['run', goFilePath, '--rename-playlist', playlistID, newName]);
    cachedLibrary = null;
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send('playlist-renamed', {playlistID, newName});
    }
    return true;
  } catch (err) {
    console.error("GO EXEC ERROR:", err);
    throw err;
  }
});

ipcMain.handle("delete-playlist", async (event, playlistID) => {
  const rootPath = path.join(__dirname, '..', '..');
  const goFilePath = path.join(rootPath, 'downloader.go');
  try {
    await execFilePromise('go', ['run', goFilePath, '--delete-playlist', playlistID]);
    cachedLibrary = null;
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send('playlist-deleted', playlistID);
    }
    return true;
  } catch (err) {
    console.error("GO EXEC ERROR:", err);
    throw err;
  }
});

ipcMain.on("start-download", (event, url, format, quality) => {
  const rootPath = path.join(__dirname, '..', '..');
  const goFilePath = path.join(rootPath, 'downloader.go');

  const allowedFormats = ['mp3', 'webm'];
  const fmt = (format || '').toLowerCase();
  if (!allowedFormats.includes(fmt)) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) windows[0].webContents.send('download-status', `Error: unsupported format '${format}'. Allowed: mp3, webm`);
    return;
  }
  const isVideo = fmt === 'webm';
  
  console.log("Spawning real-time Go worker tracking:", url);

  // 1. Initialize our go run base arguments array
  let args = ['run', goFilePath];

  if (fmt) {
    args.push('--format', fmt);
  }

  // 2. Append the video quality flag if a video format is chosen
  if (isVideo) {
    // If quality is empty or undefined, default safely to 1080p
    const targetQuality = quality ? quality.toString() : '1080p';
    args.push('--video', targetQuality);
  }

  // 3. Always push the URL as the absolute last argument item
  args.push(url);

  console.log("Spawning Go with args:", args);
  const goApp = spawn('go', args);

  let stderrData = "";

  goApp.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;

      console.log("GO STREAM STDOUT:", cleanLine);

      if (cleanLine.startsWith('{') && cleanLine.endsWith('}')) {
        try {
          const statusUpdate = JSON.parse(cleanLine);
          
          const windows = BrowserWindow.getAllWindows();
          if (windows.length > 0) {
            windows[0].webContents.send('download-progress-stream', statusUpdate);
          }
        } catch (e) {
          console.error("Failed to parse Go JSON stream:", e, "Raw line:", cleanLine);
        }
      }
    }
  });

  // Keep track of stderr in case something breaks down inside yt-dlp
  goApp.stderr.on('data', (data) => {
    stderrData += data.toString();
    console.error("GO STREAM STDERR:", data.toString());
  });

  goApp.on('close', (code) => {
    console.log(`Go worker process exited with code ${code}`);
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      if (code === 0) {
        windows[0].webContents.send('download-status', 'Finished!');
      } else {
        windows[0].webContents.send('download-status', `Error occurred (Exit Code ${code})`);
      }
    }
  });
});

ipcMain.handle('get-library', async () => {
  const rootPath = path.join(__dirname, '..', '..');
  const goFilePath = path.join(rootPath, 'downloader.go');
  
  if (cachedLibrary) return cachedLibrary;

  return new Promise((resolve, reject) => {
    execFile('go', ['run', goFilePath, '--list'], (error, stdout) => {
      if (error) reject(error);
      else {
        console.log("GO DATA:", stdout);
        cachedLibrary = JSON.parse(stdout);
        resolve(cachedLibrary);
      }
    });
  });
});

ipcMain.handle('get-songs', async (event, playlistID) => {
  const rootPath = path.join(__dirname, '..', '..');
  const goFilePath = path.join(rootPath, 'downloader.go');

  try {
    const mm = await import('music-metadata');
    const {stdout} = await execFilePromise('go', ['run', goFilePath, '--songs', playlistID]);
    const basicSongs = JSON.parse(stdout);
    // Replace the internal loop block inside ipcMain.handle('get-songs')
    const enritchedSongs = await Promise.all(basicSongs.map(async (song: any) => {
      try {
        const targetFile = song.Filename || song.filename || ""; 
        const baseAppRoot = path.join(__dirname, '..');
        
        let fullpath: string;
        if (path.isAbsolute(targetFile)) {
            fullpath = targetFile;
        } else if (targetFile.startsWith('MyVideos') || targetFile.startsWith('MyVideo') || targetFile.startsWith('MyMusic')) {
          fullpath = path.join(baseAppRoot, targetFile);
        } else {
            fullpath = path.join(baseAppRoot, 'MyMusic', targetFile);
        }

        // Try parsing metadata, safely fallback if it's a video container format
        let metadata: any = null;
        try {
            metadata = await mm.parseFile(fullpath);
        } catch(e) {
            console.log("Skipping audio ID3 tags extraction for video asset container.");
        }

        const picture = metadata?.common?.picture?.[0];
        let thumbData = "";
        if (picture) {
          const base64Thumb = Buffer.from(picture.data).toString('base64');
          thumbData = `data:${picture.format};base64,${base64Thumb}`
        }

        return {
          ...song,
          Name: metadata?.common?.title || song.Name || song.name,
          Artist: metadata?.common?.artist || "Unknown Artist",
          Duration: metadata?.format?.duration || 0,
          Thumb: thumbData || song.thumb || 'default-cover.jpg'
        };
      } catch (err) {
        return song;
      }
    }));
    return enritchedSongs;
  } catch (err) {
    console.error("GO EXEC ERROR:", err);
    throw err;
  }
});

function createWindow() {
  const win = new BrowserWindow({
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

app.whenReady().then(() => {
  protocol.registerFileProtocol('local-file', (request, callback) => {
    // 1. Strip the protocol header and decode spaces/symbols
    let relativePath = decodeURIComponent(request.url.replace(/^local-file:\/\//i, ''));

    if (process.platform === 'win32') {
      const windowsDrive = relativePath.match(/^\/([A-Za-z]:[\\/].*)$/);
      if (windowsDrive) {
        relativePath = windowsDrive[1];
      }
    }

    relativePath = relativePath.replace(/\\/g, path.sep).replace(/\//g, path.sep);
    
    try {
      // 2. Try resolving relativePath against likely app roots
      const nestedRoot = path.join(__dirname, '..'); // e.g. /.../frontend/frontend
      const outerRoot = path.join(__dirname, '..', '..'); // e.g. /.../frontend
      let finalPath: string | null = null;

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

      // CRUCIAL: This will log out the exact path Electron is trying to access on your machine
      console.log("PROTOCOL RESOLVED ABSOLUTE PATH:", finalPath);
      
      callback({ path: finalPath });
    } catch (error) {
      console.error('Failed to register protocol', error);
    }
  });
  createWindow();
});