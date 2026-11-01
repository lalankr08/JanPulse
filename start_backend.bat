@echo off
echo ====================================================================
echo Starting Jan-Pulse FastAPI Backend Service
echo Local:   http://localhost:8000
echo Network: http://10.22.130.180:8000
echo ====================================================================

set PYTHONPATH=%~dp0services\api
if not defined PYTHONHOME (
    if exist "C:\Users\Lalan kumar\AppData\Local\Programs\Python\Python314" (
        set "PYTHONHOME=C:\Users\Lalan kumar\AppData\Local\Programs\Python\Python314"
    )
)

if exist "%~dp0python.bat" (
    "%~dp0python.bat" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
) else if exist "C:\Python314\python.exe" (
    "C:\Python314\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
) else (
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
)

echo.
echo Backend service stopped.
pause
