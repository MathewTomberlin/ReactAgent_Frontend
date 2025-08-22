@echo off
setlocal enabledelayedexpansion

REM Cache Clearing Script for agentagentai.com (Windows)
REM This script helps clear caches and force refresh of the deployed site

echo.
echo ========================================
echo   Cache Clearing for agentagentai.com
echo ========================================
echo.

echo This script will help you clear various caches that might be
echo preventing your recent changes from appearing on the live site.
echo.

echo ========================================
echo   Step 1: Verify Current Deployment
echo ========================================
echo.

REM Configuration
set PROJECT_ID=1030652029012
set DOMAIN_BUCKET=www.agentagentai.com
set BUCKET_URL=gs://%DOMAIN_BUCKET%

REM Check if gcloud is installed
where gcloud >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: gcloud CLI is not installed. Please install it first.
    echo Visit: https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

REM Set the project
echo Setting project to: %PROJECT_ID%
call gcloud config set project %PROJECT_ID%

REM Check file timestamps
echo.
echo Checking file timestamps...
call gsutil stat %BUCKET_URL%/index.html | findstr "Update time"
call gsutil stat %BUCKET_URL%/index.html | findstr "Cache-Control"

echo.
echo ========================================
echo   Step 2: Force Cache Refresh
echo ========================================
echo.

echo To force a cache refresh, you can:

echo.
echo 1. Clear your browser cache:
echo    - Press Ctrl+Shift+Delete
echo    - Select "Cached images and files"
echo    - Click "Clear data"
echo.

echo 2. Try a hard refresh:
echo    - Press Ctrl+F5 or Ctrl+Shift+R
echo    - Or open an incognito/private window
echo.

echo 3. Clear Cloudflare cache (if you have access):
echo    - Log into Cloudflare dashboard
echo    - Go to Caching > Configuration
echo    - Click "Purge Everything"
echo    - Or use the API: curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
echo      -H "Authorization: Bearer {api_token}" \
echo      -H "Content-Type: application/json" \
echo      --data '{"purge_everything":true}'
echo.

echo 4. Check if the issue is with specific files:
echo    - Try accessing: https://storage.googleapis.com/%DOMAIN_BUCKET%/index.html
echo    - Compare with: https://www.agentagentai.com
echo.

echo ========================================
echo   Step 3: Redeploy with Force Refresh
echo ========================================
echo.

echo If the above doesn't work, you can force a redeploy:
echo.

echo Option A: Run the deployment script again:
echo   scripts\deploy-domain.bat
echo.

echo Option B: Force upload with cache busting:
echo   (This will be done automatically by the deployment script)
echo.

echo ========================================
echo   Step 4: Verify Changes
echo ========================================
echo.

echo After clearing caches, verify your changes by:
echo.
echo 1. Opening https://www.agentagentai.com in an incognito window
echo 2. Checking the browser's developer tools Network tab
echo 3. Looking for "Cache-Control" headers in the response
echo 4. Checking if the file timestamps match your recent deployment
echo.

echo ========================================
echo   Common Issues and Solutions
echo ========================================
echo.

echo Issue: Changes not appearing after deployment
echo Solution: Clear browser cache and try incognito mode
echo.

echo Issue: Cloudflare still showing old content
echo Solution: Purge Cloudflare cache from dashboard
echo.

echo Issue: Assets (CSS/JS) not updating
echo Solution: Check if assets have proper cache headers
echo.

echo Issue: Site works in incognito but not normal browser
echo Solution: Clear browser cache completely
echo.

echo.
pause
