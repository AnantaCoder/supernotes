@echo off
title SuperNotes (Development Mode - Live Hot Reload)
cd /d "%~dp0"

echo =========================================================
echo    SuperNotes Development Mode (Live Hot Reload Active)
echo =========================================================
echo.
echo * Any changes you make to the code will reflect LIVE in Chrome!
echo * Vite HMR will update components without refreshing the page.
echo.
echo Starting backend and frontend...
echo.

npm run dev

