import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import * as path from 'path';
import {exec} from 'child_process'
import { error } from 'console';
import {promisify} from 'util';
const execPromise = promisify(exec) 
let cachedLibrary: any = null;


ipcMain.on("download-song", (event, url) => {
  const rootPath = path.join(__dirname, '..', '..');
  const goFilePath = path.join(rootPath, 'downloader.go');
  const cmd = `go run "${goFilePath}" "${url}"`;

  console.log("Executing:", cmd);

  exec(cmd, (error, stderr, stdout) => {
    if (error) {
      console.error("GO EXEC ERROR:", error);  
      console.error("GO STDERR:", stderr);    
      event.reply('download-status', 'Error!');
    } else {
      cachedLibrary = null;
      console.log("GO STDOUT:", stdout);
      event.reply('download-status', 'Finished!');
    }
  });
});

ipcMain.handle('get-library', async () => {
  const rootPath = path.join(__dirname, '..', '..');
  const goFilePath = path.join(rootPath, 'downloader.go');
  
  if (cachedLibrary) return cachedLibrary;

  return new Promise((resolve, reject) => {    
    exec(`go run "${goFilePath}" --list`, (error,stdout) => {
      if (error) reject(error);
      else {
        console.log("GO DATA:", stdout);
        cachedLibrary = JSON.parse(stdout);
        resolve(cachedLibrary);
      };
    });
  });
});

ipcMain.handle('get-songs', async (event, playlistID) => {
  const rootPath = path.join(__dirname, '..', '..');
  const goFilePath = path.join(rootPath, 'downloader.go');
  const cmd = `go run "${goFilePath}" --songs  "${playlistID}"`;

  try {
    const mm = await import('music-metadata');
    const {stdout} = await execPromise(cmd);
    const basicSongs = JSON.parse(stdout);
    const enritchedSongs = await Promise.all(basicSongs.map(async (song: any) => {
      try {
        const musicDir = path.join(__dirname, '..','MyMusic');
        const targetFile = song.Filename || song.filename; 

        if (!targetFile) {
            console.error("Song object missing Filename:", song);
            return song;
        }

        const fullpath = path.isAbsolute(targetFile)
        ? targetFile
        : path.join(musicDir, targetFile);
        const metadata = await mm.parseFile(fullpath);
        const picture = metadata.common.picture?.[0];
        let thumbData = "";
        if (picture) {
          const base64Thumb = Buffer.from(picture.data).toString('base64');
          thumbData = `data:${picture.format};base64,${base64Thumb}`
        }

        const finalThumb = thumbData && thumbData.length > 0 ? thumbData : song.thumb;

        return {
          ...song,
          Name: metadata.common.title || song.Name,
          Artist: metadata.common.artist || "Unknown Artist",
          Duration: metadata.format.duration,
          Thumb: finalThumb,
          thumb: finalThumb
        };
      } catch (err) {
        console.error(`Metadata extraction failed for: ${song.Filename}`, err);
        return song
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
    const relativePath = decodeURIComponent(request.url.replace('local-file://', ''));
    
    try {
      const musicRoot = path.join(__dirname, '..', 'MyMusic');
      const finalPath = path.normalize(path.join(musicRoot, relativePath));
      
      console.log("Protocol loading:", finalPath); 
      callback({ path: finalPath });
    } catch (error) {
      console.error('Failed to register protocol', error);
    }
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});