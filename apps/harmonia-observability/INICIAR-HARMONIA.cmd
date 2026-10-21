@echo off
setlocal
cd /d "%~dp0collector"
where node >nul 2>nul || (echo ERROR: Node.js no esta disponible. & pause & exit /b 1)
echo Harmonia: colector local. Mantenga esta ventana abierta durante la prueba.
node server.js
if errorlevel 1 (echo ERROR: el colector se detuvo. & pause)
