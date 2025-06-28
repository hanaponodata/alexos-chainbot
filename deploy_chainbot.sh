#!/bin/bash

set -e

# Colors for output
green='\033[0;32m'
red='\033[0;31m'
reset='\033[0m'

# Paths
CHAINBOT_DIR="/opt/alexos/modules/chainbot"
BACKEND_DIR="$CHAINBOT_DIR/backend"
VENV_DIR="$CHAINBOT_DIR/venv"
ENV_FILE="$CHAINBOT_DIR/.env"
SYSTEMD_FILE="/etc/systemd/system/chainbot.service"
YAML_CONFIG_SRC="$CHAINBOT_DIR/config/chainbot.yaml"
YAML_CONFIG_DEST="$CHAINBOT_DIR/config/chainbot.yaml"

# Ensure running as root for systemd changes
if [[ $EUID -ne 0 ]]; then
  echo -e "${red}Please run as root (sudo).${reset}"
  exit 1
fi

# Step 1: Check Python version
PYTHON_BIN=$(command -v python3.10 || command -v python3)
if [[ -z "$PYTHON_BIN" ]]; then
  echo -e "${red}Python 3.10+ is required. Please install it and re-run this script.${reset}"
  exit 1
fi
PYTHON_VERSION=$($PYTHON_BIN -c 'import sys; print("{}.{}".format(sys.version_info[0], sys.version_info[1]))')
if [[ $(echo -e "$PYTHON_VERSION\n3.10" | sort -V | head -n1) != "3.10" ]]; then
  echo -e "${red}Python 3.10+ is required. Found $PYTHON_VERSION. Please install Python 3.10 or higher.${reset}"
  exit 1
fi

echo -e "${green}Using Python: $PYTHON_BIN ($PYTHON_VERSION)${reset}"

# Step 2: Create venv if not exists
if [[ ! -d "$VENV_DIR" ]]; then
  echo -e "${green}Creating virtual environment...${reset}"
  $PYTHON_BIN -m venv "$VENV_DIR"
else
  echo -e "${green}Virtual environment already exists.${reset}"
fi

# Step 3: Activate venv and install dependencies
source "$VENV_DIR/bin/activate"
echo -e "${green}Upgrading pip...${reset}"
pip install --upgrade pip
echo -e "${green}Installing requirements...${reset}"
pip install -r "$CHAINBOT_DIR/requirements.txt"

deactivate

# Step 4: Create/edit .env file
if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${green}Creating .env file...${reset}"
  touch "$ENV_FILE"
fi

echo -e "${green}Configuring .env file. Press enter to keep current value.${reset}"
declare -A env_vars
env_vars=(
  [SECRET_KEY]=""
  [DATABASE_URL]="sqlite:///./chainbot.db"
  [ALEX_OS_API_URL]="http://localhost:8000"
  [CHAINBOT_PORT]="9000"
)

for key in "${!env_vars[@]}"; do
  current=$(grep "^$key=" "$ENV_FILE" | cut -d'=' -f2-)
  read -p "$key [${current:-${env_vars[$key]}}]: " value
  value=${value:-${current:-${env_vars[$key]}}}
  # Remove existing
  sed -i "/^$key=/d" "$ENV_FILE"
  echo "$key=$value" >> "$ENV_FILE"
done

# Step 5: (Optional) Copy YAML config if not present
if [[ ! -f "$YAML_CONFIG_DEST" ]]; then
  read -p "Do you want to create a YAML config at $YAML_CONFIG_DEST? [y/N]: " yn
  if [[ "$yn" =~ ^[Yy]$ ]]; then
    touch "$YAML_CONFIG_DEST"
    echo "# Add your ChainBot YAML config here" > "$YAML_CONFIG_DEST"
    echo -e "${green}Created $YAML_CONFIG_DEST${reset}"
  fi
fi

# Step 6: Create systemd service file
cat > "$SYSTEMD_FILE" <<EOF
[Unit]
Description=ChainBot FastAPI Service
After=network.target

[Service]
User=alex
WorkingDirectory=$BACKEND_DIR
EnvironmentFile=$ENV_FILE
ExecStart=$VENV_DIR/bin/uvicorn app.main:app --host 0.0.0.0 --port 9000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo -e "${green}Reloading systemd and enabling ChainBot service...${reset}"
systemctl daemon-reload
systemctl enable chainbot
systemctl restart chainbot
sleep 2
systemctl status chainbot --no-pager

# Step 7: Health check
echo -e "${green}Performing health check...${reset}"
if curl -sSf http://localhost:9000/health > /dev/null; then
  echo -e "${green}ChainBot is running and healthy!${reset}"
else
  echo -e "${red}Health check failed. Check logs with: sudo journalctl -u chainbot -f${reset}"
fi

echo -e "${green}Deployment complete.${reset}" 