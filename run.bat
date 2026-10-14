@echo off
setlocal enabledelayedexpansion

title Resume Radar - AI Candidate Screening & Analytics Platform

echo ============================================================
echo                      RESUME RADAR
echo   AI-Powered Candidate Screening & Recruitment Analytics
echo ============================================================
echo.

:: Add common Node.js install locations to PATH if needed
if exist "C:\Program Files\nodejs" set "PATH=C:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files (x86)\nodejs" set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\nodejs" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"

:: Determine backend directory dynamically
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR="

if exist "%ROOT_DIR%backend\server.js" (
    set "BACKEND_DIR=%ROOT_DIR%backend"
) else if exist "%ROOT_DIR%..\backend\server.js" (
    set "BACKEND_DIR=%ROOT_DIR%..\backend"
)

if not defined BACKEND_DIR (
    echo [ERROR] Could not find backend directory with server.js!
    echo Looked in:
    echo   - %ROOT_DIR%backend
    echo.
    echo Please make sure run.bat is executed from the project root folder.
    pause
    exit /b 1
)

echo [OK] Backend directory located at: %BACKEND_DIR%

:: Step 1: Check Node.js
where node >nul 2>nul
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Node.js is not installed or not found in system PATH.
    echo Please install Node.js v18 or higher from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo [OK] Node.js detected: %NODE_VER%

:: Step 2: Check .env file
if not exist "%BACKEND_DIR%\.env" (
    if exist "%BACKEND_DIR%\.env.example" (
        echo [INFO] No .env found. Creating .env from .env.example...
        copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
        echo [OK] Created .env template in backend.
        echo [!] Remember to configure your GEMINI_API_KEY in %BACKEND_DIR%\.env
    ) else (
        echo [WARNING] No .env file found in backend directory.
    )
) else (
    echo [OK] Environment file (.env) found.
)

:: Step 3: Check node_modules and install dependencies if needed
if not exist "%BACKEND_DIR%\node_modules" (
    echo [INFO] node_modules not found. Installing backend dependencies...
    pushd "%BACKEND_DIR%"
    call npm install
    popd
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] npm install failed. Please check your internet connection and try again.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully.
) else (
    echo [OK] Dependencies verified.
)

echo.
echo ============================================================
echo   Starting Resume Radar server on http://localhost:8080 ...
echo ============================================================
echo.

:: Step 4: Launch Browser after brief delay
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080"

:: Step 5: Start Express Server
cd /d "%BACKEND_DIR%"
node server.js

pause
