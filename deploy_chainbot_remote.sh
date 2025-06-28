#!/bin/bash

# CONFIGURATION
PI_USER="alex"
PI_HOST="10.42.69.208"
PI_PORT="5420"
REMOTE_CHAINBOT_DIR="/opt/alexos/modules/chainbot"
DEPLOY_SCRIPT="deploy_chainbot.sh"

echo "This script will deploy ChainBot to $PI_USER@$PI_HOST on port $PI_PORT."
echo "You will be prompted for your SSH password if you do not have key-based authentication set up."
echo "You may also be prompted for your password on the Pi when the script runs sudo."
echo

# 1. Ensure deploy_chainbot.sh exists locally
if [[ ! -f "$DEPLOY_SCRIPT" ]]; then
  echo "ERROR: $DEPLOY_SCRIPT not found in current directory."
  exit 1
fi

# 2. Copy the codebase to the Pi (excluding venv, .git, __pycache__, etc.)
echo "Copying ChainBot codebase to Raspberry Pi..."
rsync -avz --exclude 'venv' --exclude '.git' --exclude '__pycache__' --exclude '*.pyc' ./ "$PI_USER@$PI_HOST:$REMOTE_CHAINBOT_DIR" -e "ssh -p $PI_PORT"

# 2b. Ensure requirements.txt is copied to the right place
echo "Copying requirements.txt to the correct location on Raspberry Pi..."
scp -P $PI_PORT chainbot/requirements.txt "$PI_USER@$PI_HOST:$REMOTE_CHAINBOT_DIR/requirements.txt"

# 3. Copy the deployment script to the Pi
echo "Copying deployment script to Raspberry Pi..."
scp -P $PI_PORT "$DEPLOY_SCRIPT" "$PI_USER@$PI_HOST:$REMOTE_CHAINBOT_DIR/"

# 4. SSH into the Pi and run the deployment script as root
echo "Running deployment script on Raspberry Pi..."
ssh -t -p $PI_PORT "$PI_USER@$PI_HOST" "cd $REMOTE_CHAINBOT_DIR && sudo bash $DEPLOY_SCRIPT"

echo
echo "Deployment complete. You can check the service status with:"
echo "  ssh -p $PI_PORT $PI_USER@$PI_HOST 'sudo systemctl status chainbot'" 