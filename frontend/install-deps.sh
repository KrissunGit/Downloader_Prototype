#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

check_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: '$1' is not installed or not in PATH."
    return 1
  fi
  return 0
}

printf "Checking required tools...\n"
check_cmd node || echo "Install Node.js from https://nodejs.org/"
check_cmd npm || echo "Install npm from https://nodejs.org/"
check_cmd go || echo "Install Go from https://go.dev/dl/"
check_cmd yt-dlp || echo "Install yt-dlp from https://github.com/yt-dlp/yt-dlp#installation"

printf "\nInstalling frontend dependencies...\n"
cd "$FRONTEND_DIR"
npm install

printf "\nBuilding frontend...\n"
npm run build

printf "\nSetup complete.\n"
printf "Run the app from the frontend/frontend folder with: npm start\n"
