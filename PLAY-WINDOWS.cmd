@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js is required. Install Node.js 24 from nodejs.org, then open this file again.
 pause
 exit /b 1
)
if not exist "node_modules\" (
 echo Installing game packages. This is only needed the first time...
 call npm ci
 if errorlevel 1 (
  echo Installation failed. Send a screenshot of this window for help.
  pause
  exit /b 1
 )
)
echo Starting The Shady Exhibit. Keep this window open while playing.
node scripts/launch.mjs
pause
