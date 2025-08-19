@echo off
echo ========================================
echo Starting React Frontend (Network Mode)
echo ========================================
echo.

REM Change to the parent directory (where package.json is located)
cd ..

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Get local IP address
echo Getting local IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    set LOCAL_IP=!LOCAL_IP: =!
    goto :found_ip
)
:found_ip

echo Local IP address: %LOCAL_IP%
echo.

REM Check if port 5173 is already in use
echo Checking if port 5173 is already in use...
netstat -an | findstr :5173 >nul
if %errorlevel% equ 0 (
    echo WARNING: Port 5173 is already in use
    echo This might be another instance of the frontend
    echo.
    set /p choice="Do you want to continue anyway? (y/N): "
    if /i not "%choice%"=="y" (
        echo Aborted.
        pause
        exit /b 0
    )
)

echo.
echo Starting React development server in NETWORK MODE...
echo.
echo Frontend will be available at:
echo   Local:  http://localhost:5173
echo   Network: http://%LOCAL_IP%:5173
echo.
echo Backend should be running at:
echo   Local:  http://localhost:8080
echo   Network: http://%LOCAL_IP%:8080
echo.
echo For mobile testing:
echo   1. Make sure your phone is on the same WiFi network
echo   2. Open browser on your phone
echo   3. Navigate to: http://%LOCAL_IP%:5173
echo   4. The frontend should automatically detect the correct backend URL
echo.
echo SECURITY NOTE: This makes the frontend accessible to other devices
echo on your network. Only use for development/testing on trusted networks.
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the development server with network access
call npm run dev -- --host

echo.
echo Development server stopped.
pause
