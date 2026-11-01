@echo off
echo ====================================================================
echo Starting Jan-Pulse FastAPI Backend Service
echo URL: http://localhost:8000
echo ====================================================================

cd /d "%~dp0backend"
set PYTHONPATH=%~dp0backend
if not defined PYTHONHOME (
    if exist "C:\Users\Lalan kumar\AppData\Local\Programs\Python\Python314" (
        set "PYTHONHOME=C:\Users\Lalan kumar\AppData\Local\Programs\Python\Python314"
    )
)

if exist "%~dp0.venv\Scripts\python.exe" (
    "%~dp0.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) else if exist "%~dp0backend\.venv\Scripts\python.exe" (
    "%~dp0backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) else if exist "%~dp0python.bat" (
    "%~dp0python.bat" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) else if exist "C:\Python314\python.exe" (
    "C:\Python314\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) else (
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
)

echo.
echo Backend service stopped.
pause
