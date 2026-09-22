@echo off
title MyCalendar Launcher
echo ===================================================
echo             MyCalendar - Desktop App
echo ===================================================
echo.

where electron >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Avvio con Electron...
    start "" electron .
    exit /b
)

where npx >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Avvio con npx electron...
    start "" npx electron .
    exit /b
)

echo Electron non rilevato in PATH.
echo Avvio in modalita desktop browser con supporto dati multi-utente...
start "" "%~dp0index.html"
