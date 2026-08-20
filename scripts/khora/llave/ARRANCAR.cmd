@echo off
setlocal
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CD%\khora.ps1" -Bootstrap
set "EC=%ERRORLEVEL%"
endlocal & exit /b %EC%
