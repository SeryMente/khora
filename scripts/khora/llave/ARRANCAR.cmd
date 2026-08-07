@echo off
setlocal
set "DEST=C:\khora-gate"
if exist "%DEST%" rd /s /q "%DEST%"
mkdir "%DEST%"
xcopy "%~dp0gate\*" "%DEST%\" /E /I /Y /Q >nul
set "TEMP=%LOCALAPPDATA%\Temp"
set "TMP=%LOCALAPPDATA%\Temp"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Bypass -Force -ErrorAction SilentlyContinue; & 'C:\khora-gate\khora.ps1'"
endlocal