#!/bin/bash

# CONFIGURATION
PI_USER="alex"
PI_HOST="10.42.69.208"
PI_PORT="5420"
REMOTE_CHAINBOT_DIR="/opt/alexos/modules/chainbot"

echo "Deploying ChainBot to $PI_USER@$PI_HOST on port $PI_PORT..."

# 1. Copy the codebase to the Pi
echo "Copying ChainBot codebase to Raspberry Pi..."
rsync -avz --exclude 'venv' --exclude '.git' --exclude '__pycache__' --exclude '*.pyc' ./ "$PI_USER@$PI_HOST:$REMOTE_CHAINBOT_DIR" -e "ssh -p $PI_PORT"

# 2. Ensure requirements.txt is in the right place
echo "Copying requirements.txt to the correct location..."
scp -P $PI_PORT chainbot/requirements.txt "$PI_USER@$PI_HOST:$REMOTE_CHAINBOT_DIR/requirements.txt"

# 3. Run deployment commands directly on the Pi
echo "Running deployment commands on Raspberry Pi..."
ssh -p $PI_PORT "$PI_USER@$PI_HOST" << 'EOF'
cd /opt/alexos/modules/chainbot

# Check Python version
PYTHON_BIN=$(command -v python3.10 || command -v python3)
if [[ -z "$PYTHON_BIN" ]]; then
  echo "ERROR: Python 3.10+ is required."
  exit 1
fi

# Create venv if not exists
if [[ ! -d "venv" ]]; then
  echo "Creating virtual environment..."
  $PYTHON_BIN -m venv venv
fi

# Install dependencies
echo "Installing dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

# Create basic .env file if not exists
if [[ ! -f ".env" ]]; then
  echo "Creating .env file..."
  cat > .env << 'ENVEOF'
SECRET_KEY=your_secret_key_here
DATABASE_URL=sqlite:///./chainbot.db
ALEX_OS_API_URL=http://localhost:8000
CHAINBOT_PORT=9000
ENVEOF
fi

# Create systemd service file
echo "Creating systemd service..."
sudo tee /etc/systemd/system/chainbot.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=ChainBot FastAPI Service
After=network.target

[Service]
User=alex
WorkingDirectory=/opt/alexos/modules/chainbot/chainbot/backend
EnvironmentFile=/opt/alexos/modules/chainbot/.env
ExecStart=/opt/alexos/modules/chainbot/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 9000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Enable and start service
echo "Starting ChainBot service..."
sudo systemctl daemon-reload
sudo systemctl enable chainbot
sudo systemctl restart chainbot

# Check status
echo "Service status:"
sudo systemctl status chainbot --no-pager

echo "Deployment complete!"
EOF

echo "Deployment finished. Check the service status above." 