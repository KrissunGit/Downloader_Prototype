# DownloaderPrototype2

This repository contains a Go backend and an Electron frontend.

## Frontend Setup

The Electron frontend lives under `frontend/frontend`.

### Install dependencies

From the `frontend` folder:

#### Linux/macOS

```bash
cd frontend
./install-deps.sh
```

#### Windows PowerShell

```powershell
cd frontend
.\\install-deps.ps1
```

### Run the app

```bash
cd frontend/frontend
npm start
```

## Notes

- The app has been updated to resolve `local-file://` paths correctly on both Linux and Windows.
- The frontend installer scripts install Node dependencies and build the renderer.
- The backend uses Go and expects `yt-dlp` available in `PATH`.
