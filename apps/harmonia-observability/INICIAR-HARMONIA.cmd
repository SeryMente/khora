@echo off
setlocal
cd /d "%~dp0collector"
set "NODE=%~dp0runtime\node.exe"
if not exist "%NODE%" for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_FALLBACK set "NODE_FALLBACK=%%N"
if not exist "%NODE%" set "NODE=%NODE_FALLBACK%"
if not exist "%NODE%" (echo ERROR: Node.js no esta disponible en el paquete. & pause & exit /b 1)
echo Harmonia: colector local. Mantenga esta ventana abierta durante la prueba.
"%NODE%" server.js
if errorlevel 1 (echo ERROR: el colector se detuvo. & pause)
