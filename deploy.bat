@echo off
REM Deployment Script for Access IDCODE Backend (Windows)
REM This script helps you prepare files for upload to your web server

echo 🚀 Preparing Access IDCODE Backend for Deployment
echo ==================================================

REM Create deployment directory
if not exist "deploy\api" mkdir deploy\api

REM Copy backend files
echo 📁 Copying backend files...
copy "backend\api.php" "deploy\api\"
copy "backend\.htaccess" "deploy\api\"
if exist "backend\README.md" copy "backend\README.md" "deploy\api\"

REM Create data directory
if not exist "deploy\api\data" mkdir deploy\api\data

echo ✅ Files ready for deployment in 'deploy' folder
echo.
echo 📋 Upload Instructions:
echo 1. Upload the entire 'deploy\api' folder to your web server
echo 2. Make sure the 'api' folder is in your website's root directory
echo 3. Ensure PHP is enabled on your server
echo 4. Set proper permissions (755) for the 'data' folder
echo.
echo 🌐 Your API will be available at: https://isaca.idcode.ng/api/
echo.
echo 🧪 Test your API by visiting: https://isaca.idcode.ng/api/health

pause
