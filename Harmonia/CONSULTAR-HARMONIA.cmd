@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0CONSULTAR-HARMONIA.ps1" %*
exit /b %ERRORLEVEL%
