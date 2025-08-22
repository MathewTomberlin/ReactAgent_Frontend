@echo off
setlocal enabledelayedexpansion

REM Test Build Script
REM This script tests the build process and directory structure

echo.
echo ========================================
echo   Test Build Process
echo ========================================
echo.

echo Current directory: %CD%
echo.

REM Check if we're in the scripts directory
if not exist "..\package.json" (
    echo ERROR: package.json not found in parent directory
    echo Please run this script from the scripts directory
    pause
    exit /b 1
)

echo Found package.json in parent directory
echo.

REM Change to parent directory
echo Changing to parent directory...
cd ..
echo Current directory: %CD%
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm ci
) else (
    echo Dependencies already installed
)

echo.

REM Build the project
echo Building project...
call npm run build -- --mode=production

echo.

REM Check if dist directory was created
if exist "dist" (
    echo SUCCESS: dist directory created
    echo.
    echo Contents of dist directory:
    dir dist
    echo.
    echo Files in dist:
    call gsutil ls -r dist 2>nul || dir /s dist
) else (
    echo ERROR: dist directory was not created
    echo Build process may have failed
)

echo.
echo ========================================
echo   Test completed
echo ========================================
echo.
pause
