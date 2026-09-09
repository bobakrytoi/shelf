@echo off
setlocal
title Shelf

rem ---------------------------------------------------------------------------
rem  Shelf setup launcher
rem  First run:  asks where the project folder is, then remembers it.
rem  Next runs:  reads the saved path and starts straight away.
rem  It installs everything into a local virtual environment, serves the app
rem  on localhost, and opens the link in your browser.
rem ---------------------------------------------------------------------------

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "CONFIG=%SCRIPT_DIR%\.shelf_path"

if exist "%CONFIG%" goto have_config

echo.
echo   Welcome to Shelf. First-time setup.
echo.
set /p "PROJECT_DIR=  Project folder [press Enter for %SCRIPT_DIR%]: "
if not defined PROJECT_DIR set "PROJECT_DIR=%SCRIPT_DIR%"
set "PROJECT_DIR=%PROJECT_DIR:"=%"
>"%CONFIG%" echo %PROJECT_DIR%
echo   Saved. Next time this will start without asking.
goto check

:have_config
set /p PROJECT_DIR=<"%CONFIG%"

:check
if not exist "%PROJECT_DIR%\requirements.txt" (
    echo.
    echo   Could not find the project here:
    echo     %PROJECT_DIR%
    echo   Delete this file and run setup again to re-enter the path:
    echo     %CONFIG%
    echo.
    pause
    exit /b 1
)

cd /d "%PROJECT_DIR%"

if not exist ".venv\Scripts\python.exe" (
    echo   Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 goto no_python
)

echo   Installing dependencies (first run may take a minute)...
".venv\Scripts\python.exe" -m pip install --quiet --upgrade pip
".venv\Scripts\python.exe" -m pip install --quiet -r requirements.txt

echo.
echo   ============================================================
echo.
echo      Shelf is running at:  http://127.0.0.1:8000
echo.
echo      Your browser will open in a moment.
echo      Keep this window open. Press Ctrl+C to stop the server.
echo.
echo   ============================================================
echo.

rem Open the browser a few seconds later, once the server is up.
start "" /min cmd /c "ping -n 4 127.0.0.1 >nul & explorer http://127.0.0.1:8000"

".venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
goto end

:no_python
echo.
echo   Python was not found on this computer.
echo   Install Python 3.10 or newer from https://www.python.org/downloads/
echo   During install, tick "Add Python to PATH", then run setup again.
echo.
pause
exit /b 1

:end
endlocal
