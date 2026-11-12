@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js LTS from https://nodejs.org/ and try again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing ZENORA dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection and try: npm install
    pause
    exit /b 1
  )
)
call npm start
pause
