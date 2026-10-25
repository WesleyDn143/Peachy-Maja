@echo off
title Peachy Maja - Auto Push
color 0A

:start
cls
echo.
echo  ==========================================
echo    Peachy Maja - Auto Push to GitHub
echo  ==========================================
echo.

cd /d "%~dp0"

:: Clean up stale git lock if a previous push crashed
if exist ".git\index.lock" (
    del /f ".git\index.lock" >nul 2>&1
    echo    Cleaned up stale git lock file.
)

echo [1/3] Staging all changes...
git add -A

echo.
echo [2/3] Committing with timestamp...
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmm"') do set DT=%%i
git commit -m "Update %DT%"
if %errorlevel% NEQ 0 (
    echo    No new changes to commit - pushing existing commits.
)

echo.
echo [3/3] Pushing to GitHub...
git push --force-with-lease origin main

echo.
if %errorlevel% == 0 (
    color 0A
    echo.
    echo  ==========================================
    echo    SUCCESS! Pushed to GitHub.
    echo    Netlify will auto-deploy in ~1 minute.
    echo  ==========================================
    echo.
    echo  Push again? (Y/N)
    choice /c YN /n /m "  > "
    if errorlevel 2 goto :done
    if errorlevel 1 goto :start
) else (
    color 0C
    echo.
    echo  ==========================================
    echo    Push failed. Try again? (Y/N)
    echo  ==========================================
    echo.
    choice /c YN /n /m "  > "
    if errorlevel 2 goto :done
    if errorlevel 1 goto :start
)

:done
echo.
echo  Goodbye!
exit
