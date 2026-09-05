@echo off
cd /d "%~dp0"

echo.
echo   Committing and pushing to remote ...
echo.

git add -A
git diff --cached --quiet || git commit -m "update blog"
git push

if errorlevel 1 (
    echo.
    echo   [FAILED] Push failed.
    echo   Check: remote configured? SSH key added to remote account?
    echo.
) else (
    echo.
    echo   [OK] Pushed. Site updates in 1-3 minutes.
    echo.
)

pause
