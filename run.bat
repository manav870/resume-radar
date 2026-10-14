@echo off
setlocal enabledelayedexpansion

title GradeFlow - AI Assignment Feedback Assistant

echo ============================================================
echo           GradeFlow FEEDBACK ASSISTANT
echo   AI-Powered Assignment Evaluation and Diagnostic Reports
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
) else if exist "%ROOT_DIR%GradeFlow-feedback\backend\server.js" (
    set "BACKEND_DIR=%ROOT_DIR%GradeFlow-feedback\backend"
) else if exist "%ROOT_DIR%vibecode-feedback\backend\server.js" (
    set "BACKEND_DIR=%ROOT_DIR%vibecode-feedback\backend"
) else if exist "%ROOT_DIR%..\backend\server.js" (
    set "BACKEND_DIR=%ROOT_DIR%..\backend"
) else (
    for /d %%D in ("%ROOT_DIR%*") do (
        if exist "%%D\backend\server.js" (
            set "BACKEND_DIR=%%D\backend"
        )
    )
)

if not defined BACKEND_DIR (
    echo [ERROR] Could not find backend directory with server.js!
    echo Looked in:
    echo   - %ROOT_DIR%backend
    echo   - %ROOT_DIR%GradeFlow-feedback\backend
    echo   - %ROOT_DIR%vibecode-feedback\backend
    echo.
    echo Please make sure run.bat is in the project folder.
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
echo [OK] Node.js found: %NODE_VER%

:: Step 2: Check backend dependencies
if not exist "%BACKEND_DIR%\node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    pushd "%BACKEND_DIR%"
    call npm install
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] npm install failed.
        popd
        pause
        exit /b 1
    )
    popd
    echo [OK] Dependencies installed successfully.
) else (
    echo [OK] Backend dependencies present.
)

:: Step 3: Check .env file
if not exist "%BACKEND_DIR%\.env" (
    if exist "%BACKEND_DIR%\.env.example" (
        echo [WARN] .env not found. Copying from .env.example...
        copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
        echo [WARN] Please ensure your GEMINI_API_KEY is configured in %BACKEND_DIR%\.env
    )
) else (
    echo [OK] Environment configuration present.
)

:: Step 4: Check service-account.json
if not exist "%BACKEND_DIR%\service-account.json" (
    echo [WARN] service-account.json not found in %BACKEND_DIR%!
    echo        Google Drive and Docs integrations will require valid credentials.
) else (
    echo [OK] Service account credentials found.
)

:: Step 5: Clean up any stale process on port 8080
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :8080 ^| findstr LISTENING') do (
    echo [INFO] Port 8080 in use by PID %%a. Freeing port...
    taskkill /F /PID %%a >nul 2>nul
)

:: Step 6: Launch browser after 2 seconds in background
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8080"

echo.
echo ============================================================
echo   Starting server at http://localhost:8080 ...
echo   Default browser will open automatically in 2 seconds.
echo   Press Ctrl+C anytime in this window to stop the server.
echo ============================================================
echo.

cd /d "%BACKEND_DIR%"
node server.js

pause
