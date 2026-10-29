@echo off
title Create SuperNotes Desktop Shortcut
cd /d "%~dp0"

echo ========================================================
echo        Creating SuperNotes Desktop Shortcut...
echo ========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $shortcut = $ws.CreateShortcut(\"$desktop\SuperNotes.lnk\"); $shortcut.TargetPath = 'wscript.exe'; $shortcut.Arguments = '\"%~dp0Launch-SuperNotes.vbs\"'; $shortcut.WorkingDirectory = '%~dp0'; $shortcut.Description = 'SuperNotes - Whiteboard & Notes with SQLite'; $chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'; if (Test-Path $chrome) { $shortcut.IconLocation = $chrome + ',0' }; $shortcut.Save(); Write-Host '>> SuperNotes shortcut created on your Desktop!' -ForegroundColor Green"

echo.
echo TIP: Drag or Pin this icon to your Windows Taskbar for 1-click launch!
echo Press any key to exit...
pause >nul
