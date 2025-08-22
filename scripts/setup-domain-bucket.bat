@echo off
setlocal enabledelayedexpansion

REM Domain Bucket Setup Script for agentagentai.com (Windows)
REM This script creates a new GCS bucket with the exact domain name for Cloudflare CNAME

REM Configuration
set PROJECT_ID=1030652029012
set DOMAIN_BUCKET=www.agentagentai.com
set BUCKET_URL=gs://%DOMAIN_BUCKET%

echo.
echo ========================================
echo   Domain Bucket Setup for agentagentai.com
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

echo Creating bucket: %DOMAIN_BUCKET%
echo.

REM Create the bucket with the exact domain name
echo Step 1: Creating GCS bucket with domain name...
call gsutil mb -p %PROJECT_ID% -c STANDARD -l US %BUCKET_URL%

REM Enable uniform bucket-level access
echo Step 2: Enabling uniform bucket-level access...
call gsutil uniformbucketlevelaccess set on %BUCKET_URL%

REM Make the bucket public by granting allUsers Storage Object Viewer permission
echo Step 3: Making bucket public (allUsers: Storage Object Viewer)...
call gsutil iam ch allUsers:objectViewer %BUCKET_URL%

REM Set the main page suffix to index.html
echo Step 4: Setting main page suffix to index.html...
call gsutil web set -m index.html %BUCKET_URL%

REM Set CORS policy for web access
echo Step 5: Setting CORS policy...
(
echo [
echo   {
echo     "origin": ["*"],
echo     "method": ["GET", "HEAD"],
echo     "responseHeader": ["Content-Type"],
echo     "maxAgeSeconds": 3600
echo   }
echo ]
) > cors.json
call gsutil cors set cors.json %BUCKET_URL%
del cors.json

REM Build and upload the React app
echo Step 6: Building and uploading React app...
REM Change to the parent directory where package.json is located
cd ..
call npm ci
call npm run build -- --mode=production

REM Upload the build to the bucket
echo Step 7: Uploading build files to bucket...
call gsutil -m rsync -r -d dist %BUCKET_URL%

REM Set cache headers for assets
echo Step 8: Setting cache headers...
call gsutil ls %BUCKET_URL%/index.html >nul 2>&1
if %errorlevel% equ 0 (
    call gsutil setmeta -h "Cache-Control:no-cache" "%BUCKET_URL%/index.html" 2>nul
    if !errorlevel! equ 0 (
        echo Set no-cache header for index.html
    ) else (
        echo WARNING: Failed to set cache header for index.html - permission issue
    )
) else (
    echo WARNING: index.html not found in bucket root
)

call gsutil ls %BUCKET_URL%/assets/ >nul 2>&1
if %errorlevel% equ 0 (
    call gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" "%BUCKET_URL%/assets/**" 2>nul
    if !errorlevel! equ 0 (
        echo Set cache headers for assets
    ) else (
        echo WARNING: Failed to set cache headers for assets - permission issue
    )
) else (
    echo WARNING: assets directory not found - checking for individual files...
    call gsutil ls %BUCKET_URL%/*.js >nul 2>&1
    if %errorlevel% equ 0 (
        call gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" "%BUCKET_URL%/*.js" 2>nul
        if !errorlevel! equ 0 (
            echo Set cache headers for JS files
        ) else (
            echo WARNING: Failed to set cache headers for JS files - permission issue
        )
    )
    call gsutil ls %BUCKET_URL%/*.css >nul 2>&1
    if %errorlevel% equ 0 (
        call gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" "%BUCKET_URL%/*.css" 2>nul
        if !errorlevel! equ 0 (
            echo Set cache headers for CSS files
        ) else (
            echo WARNING: Failed to set cache headers for CSS files - permission issue
        )
    )
)

REM Check if there were permission issues
echo.
echo Checking for permission issues...
call gsutil iam get %BUCKET_URL% | findstr "storage.objectAdmin" >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo   PERMISSION ISSUE DETECTED
    echo ========================================
    echo.
    echo Your account doesn't have storage.objectAdmin permission.
    echo This is needed to set cache headers on objects.
    echo.
    echo To fix this, run: scripts\fix-permissions.bat
    echo.
    echo Your site will still work without cache headers, but performance
    echo may be slightly slower due to reduced caching.
    echo.
)

echo.
echo ========================================
echo   Domain bucket setup completed successfully!
echo ========================================
echo.
echo Next Steps for Cloudflare Configuration:
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
echo Test URLs:
echo Direct GCS URL: https://storage.googleapis.com/%DOMAIN_BUCKET%/index.html
echo Domain URL (after DNS propagation): https://www.agentagentai.com
echo.
echo Note: DNS changes may take up to 48 hours to propagate globally.
echo.
pause
