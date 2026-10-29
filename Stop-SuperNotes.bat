@echo off
title Stop SuperNotes
echo Stopping SuperNotes server...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$found = Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -like '*backend/server.js*' -or $_.CommandLine -like '*run-dev.js*' -or $_.CommandLine -like '*supernotes*' }; if ($found) { $found | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Write-Host '>> SuperNotes stopped successfully.' -ForegroundColor Green } else { Write-Host '>> SuperNotes is not currently running.' -ForegroundColor Yellow }"

timeout /t 2 >nul
