@echo off
REM ============================================================================
REM AIR-GAPPED DEPLOYMENT BUILD SCRIPT FOR WINDOWS
REM ============================================================================

echo.
echo ========================================
echo AIR-GAPPED DEPLOYMENT BUILD
echo ========================================
echo.

REM Step 1: Clean previous builds
echo Step 1: Cleaning previous builds...
if exist .output rmdir /s /q .output
if exist server\public rmdir /s /q server\public
if exist server\dist rmdir /s /q server\dist  
if exist deployment rmdir /s /q deployment
echo.

REM Step 2: Build frontend
echo Step 2: Building frontend...
call npm run build:prod
if errorlevel 1 (
    echo Frontend build failed!
    exit /b 1
)
REM Copy Vite output to server/public
xcopy /E /I /Y .output\public\* server\public\
echo Frontend built successfully
echo.

REM Step 3: Build backend
echo Step 3: Building backend...
cd server
call npm run build
cd ..
if errorlevel 1 (
    echo Backend build failed!
    exit /b 1
)
echo Backend built successfully
echo.

REM Step 4: Verify builds
echo Step 4: Verifying builds...
if not exist server\public\index.html (
    echo ERROR: server/public/index.html missing
    exit /b 1
)
if not exist server\dist\index.js (
    echo ERROR: server/dist/index.js missing
    exit /b 1
)
echo Builds verified
echo.

REM Step 5: Create deployment package
echo Step 5: Creating deployment package...
mkdir deployment\server
echo Copying files...
xcopy /E /I /Q server\dist deployment\server\dist
xcopy /E /I /Q server\public deployment\server\public
xcopy /E /I /Q server\node_modules deployment\server\node_modules
copy server\package.json deployment\server\
copy server\.env.example deployment\server\
mkdir deployment\server\src\db\migrations
xcopy /E /I /Q server\src\db\migrations deployment\server\src\db\migrations

REM Copy documentation
copy README.md deployment\
copy AIR_GAPPED_DEPLOYMENT.md deployment\
copy COMPLETE_PROJECT_DOCUMENTATION.md deployment\

echo Deployment package created
echo.

REM Step 6: Package info
echo Step 6: Package created successfully
echo.
echo ========================================
echo DEPLOYMENT PACKAGE READY
echo ========================================
echo.
echo Location: deployment\
echo.
echo Next steps:
echo 1. Manually zip the deployment\ folder
echo 2. Transfer to Ubuntu 24 VM
echo 3. Follow deployment\AIR_GAPPED_DEPLOYMENT.md
echo 4. Start with: cd server ^&^& npm start
echo.
