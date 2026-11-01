@echo off
echo ====================================================================
echo Starting Jan-Pulse Next.js Web App
echo URL:     http://localhost:3000
echo Backend: http://localhost:8000
echo ====================================================================

cd /d "%~dp0frontend"
set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Frontend service exited with error code %ERRORLEVEL%.
    pause
)
