@echo off
title KHORA EP
setlocal

set "USBROOT=%~dp0"
set "GATE=%USBROOT%..\khora.ps1"

if not exist "%GATE%" (
    echo [ERROR] No se encuentra KHORA GATE:
    echo %GATE%
    pause
    exit /b 1
)

set "TEMP=%LOCALAPPDATA%\Temp"
set "TMP=%LOCALAPPDATA%\Temp"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%GATE%" %*

endlocal
