@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0INICIAR-HARMONIA.ps1"
exit /b %ERRORLEVEL%
