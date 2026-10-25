@echo off
title Peachy Maja ? Auto Git Push
color 0A

echo.
echo  ==========================================
echo    Peachy Maja ? Auto Push to GitHub
echo  ==========================================
echo.

cd /d "%~dp0"

echo [1/4] Staging all changes...
git add -A

echo.
echo [2/4] Committing with timestamp...
for /f "tokens=2 delims==/" %%a in ('wmic os get localdatetime /value') do set DT=%%a
set DATESTR=%DT:~0,4%-%DT:~4,2%-%DT:~6,2%
set TIMESTR=%DT:~8,2%:%DT:~10,2%
git commit -m "Auto-update: %DATESTR% %TIMESTR%"

echo.
echo [3/4] Pulling latest from GitHub (sync first)...
git pull origin main --rebase

echo.
echo [4/4] Pushing to GitHub...
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
    echo    Try running: git pull origin main
    echo    Then double-click this file again.
    echo  ==========================================
)

echo.
pause
