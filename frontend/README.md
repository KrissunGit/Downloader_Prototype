# Downloader Frontend Setup

This repository contains the Electron frontend for the Downloader app.

## Supported Platforms

- Linux
- Windows

## Prerequisites

- Node.js + npm
- Go
- `yt-dlp`

## Install dependencies

### Linux / macOS

```bash
cd frontend
./install-deps.sh
```

### Windows PowerShell

```powershell
cd frontend
.\\install-deps.ps1
```

## Start the app

```bash
cd frontend/frontend
npm start
```

## Quick frontend commands

```bash
cd frontend/frontend
npm run setup      # install node deps
npm run build      # compile TypeScript
npm start          # launch Electron app
```

## Notes

The app uses a custom `local-file://` protocol handler and has been updated to resolve file paths correctly on both Linux and Windows.
