@echo off
echo Starting Jan-Pulse Next.js Web App on LAN (http://10.22.130.180:3000) ...
cd /d "%~dp0apps\web"
set NEXT_PUBLIC_API_URL=http://10.22.130.180:8000
npm run dev -- --hostname 0.0.0.0 --port 3000
