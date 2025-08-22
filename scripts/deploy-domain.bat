@echo off
setlocal enabledelayedexpansion

REM Domain Deployment Script for agentagentai.com (Windows)
REM This script deploys updates to the domain-specific bucket

REM Configuration
set PROJECT_ID=1030652029012
set DOMAIN_BUCKET=www.agentagentai.com
set BUCKET_URL=gs://%DOMAIN_BUCKET%

echo.
echo ========================================
echo   Domain Deployment for agentagentai.com
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

REM Check if bucket exists
call gsutil ls %BUCKET_URL% >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Bucket %DOMAIN_BUCKET% does not exist.
    echo Please run the setup script first: scripts\setup-domain-bucket.bat
    pause
    exit /b 1
)

echo Deploying to domain bucket: %DOMAIN_BUCKET%
echo.

REM Install dependencies
echo Installing dependencies...
REM Change to the parent directory where package.json is located
cd ..
call npm ci

REM Build the project
echo Building for production...
call npm run build -- --mode=production

REM Deploy to Cloud Storage
echo Deploying to Cloud Storage...
call gsutil -m rsync -r -d dist %BUCKET_URL%

REM Set cache headers for assets
echo Setting cache headers...
call gsutil ls %BUCKET_URL%/index.html >nul 2>&1
if %errorlevel% equ 0 (
    call gsutil setmeta -h "Cache-Control:no-cache, no-store, must-revalidate" "%BUCKET_URL%/index.html"
    echo Set no-cache header for index.html
) else (
    echo WARNING: index.html not found in bucket root
)

call gsutil ls %BUCKET_URL%/assets/ >nul 2>&1
if %errorlevel% equ 0 (
    call gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" "%BUCKET_URL%/assets/**"
    echo Set cache headers for assets
) else (
    echo WARNING: assets directory not found - checking for individual files...
    call gsutil ls %BUCKET_URL%/*.js >nul 2>&1
    if %errorlevel% equ 0 (
        call gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" "%BUCKET_URL%/*.js"
        echo Set cache headers for JS files
    )
    call gsutil ls %BUCKET_URL%/*.css >nul 2>&1
    if %errorlevel% equ 0 (
        call gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" "%BUCKET_URL%/*.css"
        echo Set cache headers for CSS files
    )
)

echo.
echo ========================================
echo   Successfully deployed to domain bucket!
echo ========================================
echo.
echo Deployment timestamp: %date% %time%
echo URLs:
echo Direct GCS URL: https://storage.googleapis.com/%DOMAIN_BUCKET%/index.html
echo Domain URL: https://www.agentagentai.com
echo.
echo Checking if the site is accessible...
echo.
echo Testing direct GCS access...
call gsutil ls %BUCKET_URL%/index.html >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Direct GCS access: OK
) else (
    echo ✗ Direct GCS access: FAILED
)

echo.
echo ========================================
echo   IMPORTANT: DNS Configuration Required
echo ========================================
echo.
echo If you cannot access https://www.agentagentai.com, you need to:
echo.
echo 1. Log into your Cloudflare dashboard
echo 2. Add your domain: agentagentai.com
echo 3. Update your domain's nameservers at GoDaddy to point to Cloudflare
echo 4. In Cloudflare DNS settings, create a CNAME record:
echo    - Name: www
echo    - Target: c.storage.googleapis.com
echo    - Proxy status: Proxied (orange cloud)
echo 5. In Cloudflare SSL/TLS settings:
echo    - Set SSL/TLS mode to 'Full'
echo    - Enable 'Always Use HTTPS'
echo.
echo Note: DNS changes may take up to 48 hours to propagate globally.
echo.
pause
