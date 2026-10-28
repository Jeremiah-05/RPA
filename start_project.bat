@echo off
title Automated Expense Claim Verification System - Launcher
color 0A

echo =====================================================================
echo   Automated Expense Claim Verification System (RPA + Full Stack)
echo =====================================================================
echo.
echo [1/3] Starting Backend Server (Port 5000)...
start "Backend API (Node.js)" cmd /k "cd /d \"%~dp0backend\" && npm start"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Frontend Web Portal (Port 5173)...
start "Frontend UI (Vite React)" cmd /k "cd /d \"%~dp0frontend\" && npm run dev"

timeout /t 3 /nobreak >nul

echo [3/3] Opening Web Portal in Default Browser...
start http://localhost:5173

echo.
echo =====================================================================
echo   System is UP and RUNNING!
echo   - Web Portal: http://localhost:5173
echo   - Backend API: http://localhost:5000/api/health
echo   - UiPath Bot Project: %~dp0rpa\UiPath_Workflow_Files\project.json
echo =====================================================================
echo.
pause
