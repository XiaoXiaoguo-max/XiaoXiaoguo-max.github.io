@echo off
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
    echo.
    echo   [ERROR] Python not found in PATH.
    echo   Install Python, or run this manually:
    echo       py -m http.server 8000
    echo.
    pause
    exit /b 1
)

echo.
echo   Blog is starting ...
echo   URL    : http://localhost:8000
echo   Stop   : Ctrl + C
echo.
start "" http://localhost:8000
python -m http.server 8000
