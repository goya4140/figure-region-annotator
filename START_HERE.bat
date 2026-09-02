@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is required. Download it from https://nodejs.org/
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies for the first launch...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

echo Opening FigureLabel at http://127.0.0.1:4173/
echo Keep this window open while annotating. Press Ctrl+C to stop.
call npm start
pause
