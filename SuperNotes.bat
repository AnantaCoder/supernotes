@echo off
title SuperNotes Launcher
cd /d "%~dp0"

:: Check if node is available
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required to run SuperNotes.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Run silently via VBS if possible, or start minimized node process
if exist "Launch-SuperNotes.vbs" (
    wscript "Launch-SuperNotes.vbs"
    exit
) else (
    start /min "" node backend/server.js
    exit
)

