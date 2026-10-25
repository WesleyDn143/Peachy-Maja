@echo off
title Peachy Maja ? Auto Git Push
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
for /f "tokens=1-5 delims=/ " %%a in ("%date%") do set DATESTR=%%c-%%b-%%a
for /f "tokens=1-2 delims=: " %%a in ("%time%") do set TIMESTR=%%a:%%b
git commit -m "Auto-update: %DATESTR% %TIMESTR%"

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
    echo    ERROR: Push failed. Check credentials.
    echo  ==========================================
)

echo.
pause
