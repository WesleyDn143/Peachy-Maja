@echo off
title Peachy Maja ? Auto Push
color 0A

echo.
echo  ==========================================
echo    Peachy Maja ? Auto Push to GitHub
echo  ==========================================
echo.

cd /d "%~dp0"

echo [1/3] Staging all changes...
git add -A

echo.
echo [2/3] Committing with timestamp...
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmm"') do set DT=%%i
git commit -m "Auto-update %DT%"
if %errorlevel% NEQ 0 (
  echo    (No new changes to commit - skipping)
)

echo.
echo [3/3] Pushing to GitHub...
git push origin main

echo.
if %errorlevel% == 0 (
    color 0A
    echo  ==========================================
    echo    SUCCESS! Site pushed to GitHub.
    echo    Netlify will auto-deploy in ~1 minute.
    echo  ==========================================
) else (
    color 0C
    echo  ==========================================
    echo    ERROR: Push failed.
    echo    Close this window and try again.
    echo  ==========================================
)

echo.
pause
