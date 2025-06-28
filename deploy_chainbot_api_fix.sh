#!/bin/bash

# ChainBot API Fix Deployment Script
# Fixes the static file mounting issue that was overriding API endpoints

echo "🔧 Deploying ChainBot API fix to Raspberry Pi..."

# Configuration
PI_HOST="10.42.69.208"
PI_PORT="5420"
PI_USER="alex"
CHAINBOT_PATH="/opt/alexos/modules/chainbot"

echo "📡 Copying fixed main.py to Raspberry Pi..."
scp -P $PI_PORT chainbot/backend/app/main.py $PI_USER@$PI_HOST:$CHAINBOT_PATH/chainbot/backend/app/main.py

if [ $? -eq 0 ]; then
    echo "✅ File copied successfully"
else
    echo "❌ Failed to copy file"
    exit 1
fi

echo "🔄 Restarting ChainBot service..."
ssh -p $PI_PORT $PI_USER@$PI_HOST "sudo systemctl restart chainbot"

if [ $? -eq 0 ]; then
    echo "✅ Service restarted successfully"
else
    echo "❌ Failed to restart service"
    exit 1
fi

echo "⏳ Waiting for service to start..."
sleep 5

echo "🔍 Checking service status..."
ssh -p $PI_PORT $PI_USER@$PI_HOST "sudo systemctl status chainbot --no-pager"

echo "🧪 Testing API endpoints..."
echo "Testing /health endpoint:"
curl -s http://$PI_HOST:9000/health | jq . || echo "Health endpoint test failed"

echo "Testing /api endpoint:"
curl -s http://$PI_HOST:9000/api/health | jq . || echo "API health endpoint test failed"

echo "Testing GUI endpoint:"
curl -s http://$PI_HOST:9000/gui | head -5 || echo "GUI endpoint test failed"

echo "🎉 ChainBot API fix deployment complete!"
echo ""
echo "📋 Summary:"
echo "- API endpoints should now be accessible at /health, /api/*"
echo "- GUI is now accessible at /gui"
echo "- Service has been restarted"
echo ""
echo "🔗 Test URLs:"
echo "- API Health: http://$PI_HOST:9000/health"
echo "- API Docs: http://$PI_HOST:9000/docs"
echo "- GUI: http://$PI_HOST:9000/gui" 