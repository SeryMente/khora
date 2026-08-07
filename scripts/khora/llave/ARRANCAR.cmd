@echo off
title KHORA EP
net session >nul 2>&1 || ( echo Ejecuta ARRANCAR.cmd como Administrador. & pause & exit /b 1 )
set "DEST=C:\khora-gate"
if exist "%DEST%" rd /s /q "%DEST%"
mkdir "%DEST%"
xcopy "%~dp0khora\gate\*" "%DEST%\" /E /I /Y /Q >nul
set "TEMP=%LOCALAPPDATA%\Temp"
set "TMP=%LOCALAPPDATA%\Temp"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; & 'C:\khora-gate\khora.ps1'"
