@echo off
setlocal enabledelayedexpansion
title PyMaster 30 - 30 Days of Python Studio

:: Switch to script directory regardless of where it was launched from
cd /d "%~dp0"

echo =====================================================================
echo           PyMaster 30 - 30 Days of Python Interactive Studio
echo =====================================================================
echo.
echo [*] Initializing local environment...

:: Detect Python executable (python or py launcher)
set "PYTHON_CMD="
where python >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=python"
) else (
    where py >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_CMD=py"
    )
)

if "%PYTHON_CMD%"=="" (
    echo.
    echo [ERROR] Python was not found on your system PATH!
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    echo and ensure "Add Python to PATH" is checked during installation.
    echo.
    pause
    exit /b 1
)

:: Display detected Python version
for /f "tokens=*" %%v in ('%PYTHON_CMD% --version 2^>^&1') do set "PY_VER=%%v"
echo [+] Detected Python: !PY_VER!
echo [+] Starting local PyMaster 30 Studio server...
echo [*] Studio will automatically open in your default browser at http://localhost:5000/
echo [*] Press Ctrl+C in this window anytime to stop the server.
echo =====================================================================
echo.

if exist "server.py" (
    "%PYTHON_CMD%" server.py
) else if exist "..\start_app.py" (
    "%PYTHON_CMD%" ..\start_app.py
) else (
    echo [ERROR] server.py was not found!
    pause
    exit /b 1
)

pause
