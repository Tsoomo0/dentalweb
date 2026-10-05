@echo off
REM Double-click to install. Runs install.ps1 (messages are in Mongolian there).
REM Keep this file ASCII-only: cmd misreads UTF-8 batch files.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
echo.
pause
