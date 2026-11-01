@echo off
echo ====================================================================
echo Starting Jan-Pulse Next.js Web App on LAN
echo Local:   http://localhost:3000
echo Network: http://10.22.130.180:3000
echo Backend: http://10.22.130.180:8000
echo ====================================================================

cd /d "%~dp0apps\web"
set NEXT_PUBLIC_API_URL=http://10.22.130.180:8000
npm run dev -- --hostname 0.0.0.0 --port 3000

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Frontend service exited with error code %ERRORLEVEL%.
    pause
)
