@echo off
title Create SuperNotes Desktop Shortcut
cd /d "%~dp0"

echo ========================================================
echo        Creating SuperNotes Desktop Shortcut...
echo ========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $shortcut = $ws.CreateShortcut(\"$desktop\SuperNotes.lnk\"); $shortcut.TargetPath = 'wscript.exe'; $shortcut.Arguments = '\"%~dp0Launch-SuperNotes.vbs\"'; $shortcut.WorkingDirectory = '%~dp0'; $shortcut.Description = 'SuperNotes - Whiteboard & Notes with SQLite'; $shortcut.Save(); Write-Host '>> SuperNotes shortcut created on your Desktop!' -ForegroundColor Green"

echo.
echo You can now start SuperNotes directly from your Desktop anytime!
echo Press any key to exit...
pause >nul

