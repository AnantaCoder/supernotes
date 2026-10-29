@echo off
title Stop SuperNotes
echo Stopping SuperNotes background server...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$found = Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -like '*backend/server.js*' }; if ($found) { $found | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }; Write-Host '>> SuperNotes stopped successfully.' -ForegroundColor Green } else { Write-Host '>> SuperNotes is not currently running.' -ForegroundColor Yellow }"

timeout /t 2 >nul

