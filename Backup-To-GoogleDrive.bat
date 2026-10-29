@echo off
title SuperNotes - Database Backup
cd /d "%~dp0"

echo =========================================================
echo       SuperNotes SQLite Database Backup
echo =========================================================
echo.

node scripts/backup.js

echo.
if "%1"=="/silent" exit /b 0

echo Press any key to open the backups folder...
pause >nul
explorer backups

