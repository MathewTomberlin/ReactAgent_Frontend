@echo off
setlocal enabledelayedexpansion

REM Domain Status Check Script for agentagentai.com (Windows)
REM This script checks the status of the domain deployment

REM Configuration
set PROJECT_ID=1030652029012
set DOMAIN_BUCKET=www.agentagentai.com
set BUCKET_URL=gs://%DOMAIN_BUCKET%

echo.
echo ========================================
echo   Domain Status Check for agentagentai.com
echo ========================================
echo.

REM Check if gcloud is installed
where gcloud >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: gcloud CLI is not installed. Please install it first.
    echo Visit: https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

REM Check if we're authenticated
call gcloud auth list --filter=status:ACTIVE --format="value(account)" | findstr /r "." >nul
if %errorlevel% neq 0 (
    echo WARNING: You are not authenticated with gcloud. Please run:
    echo gcloud auth login
    pause
    exit /b 1
)

REM Set the project
echo Setting project to: %PROJECT_ID%
call gcloud config set project %PROJECT_ID%

echo.
echo ========================================
echo   Checking Bucket Status
echo ========================================
echo.

REM Check if bucket exists
call gsutil ls %BUCKET_URL% >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Bucket exists: %DOMAIN_BUCKET%
) else (
    echo ✗ Bucket does not exist: %DOMAIN_BUCKET%
    echo   Run: scripts\setup-domain-bucket.bat
    pause
    exit /b 1
)

REM Check if index.html exists
call gsutil ls %BUCKET_URL%/index.html >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ index.html exists in bucket
) else (
    echo ✗ index.html not found in bucket
    echo   Run: scripts\deploy-domain.bat
    pause
    exit /b 1
)

REM Check bucket permissions
echo.
echo Checking bucket permissions...
call gsutil iam get %BUCKET_URL% | findstr "allUsers" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Bucket is public (allUsers has access)
) else (
    echo ✗ Bucket is not public
    echo   Run: scripts\setup-domain-bucket.bat
)

echo.
echo ========================================
echo   Testing Access URLs
echo ========================================
echo.

echo Direct GCS URL: https://storage.googleapis.com/%DOMAIN_BUCKET%/index.html
echo Domain URL: https://www.agentagentai.com
echo.

echo ========================================
echo   DNS Configuration Status
echo ========================================
echo.

echo To check if your domain is working:
echo.
echo 1. Try accessing: https://storage.googleapis.com/%DOMAIN_BUCKET%/index.html
echo    - If this works, the bucket is properly configured
echo.
echo 2. Try accessing: https://www.agentagentai.com
echo    - If this doesn't work, DNS configuration is needed
echo.
echo DNS Configuration Required:
echo 1. Log into Cloudflare dashboard
echo 2. Add domain: agentagentai.com
echo 3. Update nameservers at GoDaddy to point to Cloudflare
echo 4. Create CNAME record in Cloudflare:
echo    - Name: www
echo    - Target: c.storage.googleapis.com
echo    - Proxy: Enabled (orange cloud)
echo 5. Set SSL/TLS mode to 'Full'
echo 6. Enable 'Always Use HTTPS'
echo.
echo Note: DNS changes can take up to 48 hours to propagate.
echo.
pause
