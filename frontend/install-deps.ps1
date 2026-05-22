$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $rootDir 'frontend'

function Check-Command($name, $installUrl) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "WARNING: '$name' not found. Install it from: $installUrl" -ForegroundColor Yellow
    } else {
        Write-Host "$name detected."
    }
}

Write-Host "Checking required tools..."
Check-Command node 'https://nodejs.org/'
Check-Command npm 'https://nodejs.org/'
Check-Command go 'https://go.dev/dl/'
Check-Command yt-dlp 'https://github.com/yt-dlp/yt-dlp#installation'

Write-Host "`nInstalling frontend dependencies..."
Set-Location $frontendDir
npm install

Write-Host "`nBuilding frontend..."
npm run build

Write-Host "`nSetup complete. Run the app with: npm start" -ForegroundColor Green
