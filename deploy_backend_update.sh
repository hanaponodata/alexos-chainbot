#!/bin/bash

# Deploy updated ChainBot backend to Pi
echo "Deploying updated ChainBot backend to Pi..."

# Copy updated backend file to Pi
scp -P 5420 chainbot/chainbot_backend.py alex@10.42.69.208:/opt/alexos/modules/chainbot/backend/

# Restart the backend service on Pi
ssh -p 5420 alex@10.42.69.208 << 'EOF'
cd /opt/alexos/modules/chainbot/backend
sudo systemctl restart chainbot-backend
sudo systemctl status chainbot-backend
EOF

echo "Backend deployment complete!" 