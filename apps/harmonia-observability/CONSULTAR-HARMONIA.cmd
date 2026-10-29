@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0collector\query.ps1" %*
