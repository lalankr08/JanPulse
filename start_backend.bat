@echo off
echo Starting Jan-Pulse FastAPI Backend Service on http://127.0.0.1:8000 ...
set PYTHONPATH=%~dp0services\api
if exist "%~dp0.venv\Scripts\python.exe" (
    "%~dp0.venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) else if exist "%~dp0python.bat" (
    "%~dp0python.bat" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) else (
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
)
