#!/bin/bash

# Deployment Script for Access IDCODE Backend
# This script helps you prepare files for upload to your web server

echo "🚀 Preparing Access IDCODE Backend for Deployment"
echo "=================================================="

# Create deployment directory
mkdir -p deploy/api

# Copy backend files
echo "📁 Copying backend files..."
cp backend/api.php deploy/api/
cp backend/.htaccess deploy/api/
cp backend/README.md deploy/api/ 2>/dev/null || echo "README.md not found (optional)"

# Create data directory with proper permissions
mkdir -p deploy/api/data
chmod 755 deploy/api/data

echo "✅ Files ready for deployment in 'deploy' folder"
echo ""
echo "📋 Upload Instructions:"
echo "1. Upload the entire 'deploy/api' folder to your web server"
echo "2. Make sure the 'api' folder is in your website's root directory"
echo "3. Ensure PHP is enabled on your server"
echo "4. Set proper permissions (755) for the 'data' folder"
echo ""
echo "🌐 Your API will be available at: https://isaca.idcode.ng/api/"
echo ""
echo "🧪 Test your API by visiting: https://isaca.idcode.ng/api/health"
