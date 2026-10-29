@echo off
title Schedule Daily SuperNotes Backup
cd /d "%~dp0"

echo =========================================================
echo     Schedule Daily SuperNotes Backup (Windows Task)
echo =========================================================
echo.
echo This configures a silent automated backup every day at 9:00 PM.
echo.

schtasks /create /tn "SuperNotes_Daily_Backup" /tr "\"%~dp0Backup-To-GoogleDrive.bat\" /silent" /sc daily /st 21:00 /f

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Daily backup task scheduled successfully!
    echo It will run silently every day at 9:00 PM and save to backups/ and Google Drive.
) else (
    echo.
    echo [NOTE] Windows may require Administrator rights to register scheduled tasks.
    echo If this failed, right-click this file and choose "Run as administrator".
)

echo.
pause

