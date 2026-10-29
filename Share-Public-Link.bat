@echo off
title SuperNotes - Public Port Forwarding
cd /d "%~dp0"

echo ========================================================
echo       SuperNotes Instant Public Port Forwarding
echo ========================================================
echo.
echo Forwarding local port 5050 to a secure public URL...
echo (You can open the generated link on your phone, tablet,
echo  or share it with anyone over the internet!)
echo.

npx localtunnel --port 5050

