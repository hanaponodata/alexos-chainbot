#!/bin/bash

# ChainBot ALEX OS Deployment Script for Raspberry Pi
# This script sets up ChainBot with full ALEX OS integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CHAINBOT_DIR="/opt/chainbot"
SERVICE_NAME="chainbot"
USER_NAME="chainbot"
ALEX_OS_HOST="10.42.69.208"
ALEX_OS_PORT="8000"
CHAINBOT_PORT="9000"

echo -e "${BLUE}🤖 ChainBot ALEX OS Deployment Script${NC}"
echo "=========================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Check if we're on a Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo; then
    print_warning "This script is designed for Raspberry Pi. Continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_status "Starting ChainBot ALEX OS deployment..."

# Update system
print_status "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required packages
print_status "Installing required packages..."
apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    wget \
    nginx \
    supervisor \
    ufw \
    htop \
    vim

# Create chainbot user
print_status "Creating chainbot user..."
if ! id "$USER_NAME" &>/dev/null; then
    useradd -m -s /bin/bash "$USER_NAME"
    usermod -aG sudo "$USER_NAME"
    print_status "User $USER_NAME created"
else
    print_status "User $USER_NAME already exists"
fi

# Create application directory
print_status "Creating application directory..."
mkdir -p "$CHAINBOT_DIR"
chown "$USER_NAME:$USER_NAME" "$CHAINBOT_DIR"

# Clone or copy ChainBot
if [ -d "chainbot" ]; then
    print_status "Copying ChainBot from current directory..."
    cp -r chainbot/* "$CHAINBOT_DIR/"
else
    print_status "Cloning ChainBot from repository..."
    cd "$CHAINBOT_DIR"
    git clone https://github.com/your-repo/chainbot.git .
    chown -R "$USER_NAME:$USER_NAME" "$CHAINBOT_DIR"
fi

# Set up Python virtual environment
print_status "Setting up Python virtual environment..."
cd "$CHAINBOT_DIR"
sudo -u "$USER_NAME" python3 -m venv venv
sudo -u "$USER_NAME" ./venv/bin/pip install --upgrade pip

# Install Python dependencies
print_status "Installing Python dependencies..."
sudo -u "$USER_NAME" ./venv/bin/pip install -r requirements.txt

# Create configuration file
print_status "Creating configuration file..."
cat > "$CHAINBOT_DIR/config.yaml" << EOF
# ChainBot Configuration for ALEX OS Integration
server:
  host: "0.0.0.0"
  port: $CHAINBOT_PORT
  debug: false

alex_os:
  module_registry_url: "http://$ALEX_OS_HOST:$ALEX_OS_PORT"
  event_bus_url: "ws://$ALEX_OS_HOST:$ALEX_OS_PORT/ws/events"
  webhook_url: "http://$(hostname -I | awk '{print $1}'):$CHAINBOT_PORT/api/webhooks/chainbot"
  health_check_interval: 60
  registration_retry_interval: 30
  max_registration_attempts: 10

chainbot:
  name: "chainbot"
  version: "1.0.0"
  description: "Advanced workflow orchestration engine with AI agent management"
  role: "workflow_orchestrator"
  capabilities:
    - "workflow_engine"
    - "agent_manager"
    - "gui"
    - "websocket"
    - "chatgpt_import"
    - "gpt_integration"
    - "real_time_monitoring"
    - "audit_logging"
    - "multi_agent_coordination"
  ui_features:
    - "Agent Map Window"
    - "Code Agent Window"
    - "Chat Window"
    - "Watchtower Window"
    - "Workflow Builder Window"
    - "Data Importer Window"
  endpoints:
    - "/api/agents/*"
    - "/api/workflows/*"
    - "/api/gpt/*"
    - "/api/chatgpt/*"
    - "/api/audit/*"
    - "/api/websockets/*"
    - "/api/webhooks/chainbot/*"
  health_endpoint: "/health"
  docs_endpoint: "/docs"

openai:
  api_key: "${OPENAI_API_KEY:-}"
  base_url: "https://api.openai.com/v1"
  model: "gpt-4"
  max_tokens: 4000
  temperature: 0.7
  timeout: 30

maclink:
  base_url: "http://localhost:8080"
  api_key: "${MACLINK_API_KEY:-}"
  timeout: 30
  enabled: true

websocket:
  max_connections: 100
  heartbeat_interval: 30
  connection_timeout: 300
  message_size_limit: 1048576

security:
  secret_key: "${SECRET_KEY:-your-secret-key-change-in-production}"
  algorithm: "HS256"
  access_token_expire_minutes: 30
  cors_origins: "*"
  rate_limit_requests: 100
  rate_limit_window: 60

logging:
  level: "INFO"
  format: "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
  file: "chainbot.log"
  max_size: 10485760
  backup_count: 5

audit:
  enabled: true
  log_all_actions: true
  retention_days: 90
  export_format: "json"

workflow:
  max_concurrent_workflows: 10
  workflow_timeout: 3600
  auto_retry_failed: true
  max_retry_attempts: 3

agent:
  max_concurrent_agents: 20
  agent_timeout: 300
  default_agent_type: "general_assistant"
  agent_heartbeat_interval: 30

gui:
  enabled: true
  port: 3000
  host: "0.0.0.0"
  build_path: "../gui/dist"
  serve_static: true
EOF

chown "$USER_NAME:$USER_NAME" "$CHAINBOT_DIR/config.yaml"

# Create systemd service
print_status "Creating systemd service..."
cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=ChainBot ALEX OS Integration
After=network.target

[Service]
Type=simple
User=$USER_NAME
Group=$USER_NAME
WorkingDirectory=$CHAINBOT_DIR
Environment=PATH=$CHAINBOT_DIR/venv/bin
Environment=PYTHONPATH=$CHAINBOT_DIR
Environment=OPENAI_API_KEY=${OPENAI_API_KEY:-}
Environment=MACLINK_API_KEY=${MACLINK_API_KEY:-}
Environment=SECRET_KEY=${SECRET_KEY:-your-secret-key-change-in-production}
ExecStart=$CHAINBOT_DIR/venv/bin/python -m app.main
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create supervisor configuration
print_status "Creating supervisor configuration..."
cat > "/etc/supervisor/conf.d/$SERVICE_NAME.conf" << EOF
[program:$SERVICE_NAME]
command=$CHAINBOT_DIR/venv/bin/python -m app.main
directory=$CHAINBOT_DIR
user=$USER_NAME
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/$SERVICE_NAME.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=10
EOF

# Configure firewall
print_status "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow "$CHAINBOT_PORT"
ufw allow 80
ufw allow 443
print_status "Firewall configured"

# Configure nginx
print_status "Configuring nginx..."
cat > "/etc/nginx/sites-available/$SERVICE_NAME" << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:$CHAINBOT_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:$CHAINBOT_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf "/etc/nginx/sites-available/$SERVICE_NAME" "/etc/nginx/sites-enabled/"
rm -f /etc/nginx/sites-enabled/default

# Create startup script
print_status "Creating startup script..."
cat > "$CHAINBOT_DIR/start.sh" << 'EOF'
#!/bin/bash

# ChainBot Startup Script
cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Set environment variables
export PYTHONPATH="$PWD"
export OPENAI_API_KEY="${OPENAI_API_KEY:-}"
export MACLINK_API_KEY="${MACLINK_API_KEY:-}"
export SECRET_KEY="${SECRET_KEY:-your-secret-key-change-in-production}"

# Start ChainBot
python -m app.main
EOF

chmod +x "$CHAINBOT_DIR/start.sh"
chown "$USER_NAME:$USER_NAME" "$CHAINBOT_DIR/start.sh"

# Create health check script
print_status "Creating health check script..."
cat > "$CHAINBOT_DIR/health_check.sh" << 'EOF'
#!/bin/bash

# ChainBot Health Check Script
CHAINBOT_URL="http://localhost:9000/health"
MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
    if curl -f -s "$CHAINBOT_URL" > /dev/null; then
        echo "ChainBot is healthy"
        exit 0
    else
        echo "Health check failed (attempt $i/$MAX_RETRIES)"
        if [ $i -lt $MAX_RETRIES ]; then
            sleep $RETRY_DELAY
        fi
    fi
done

echo "ChainBot health check failed after $MAX_RETRIES attempts"
exit 1
EOF

chmod +x "$CHAINBOT_DIR/health_check.sh"
chown "$USER_NAME:$USER_NAME" "$CHAINBOT_DIR/health_check.sh"

# Create log directory
print_status "Creating log directory..."
mkdir -p "/var/log/$SERVICE_NAME"
chown "$USER_NAME:$USER_NAME" "/var/log/$SERVICE_NAME"

# Reload systemd and enable services
print_status "Enabling services..."
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl enable nginx
systemctl enable supervisor

# Start services
print_status "Starting services..."
systemctl start nginx
systemctl start supervisor
systemctl start "$SERVICE_NAME"

# Wait for service to start
print_status "Waiting for ChainBot to start..."
sleep 10

# Check service status
if systemctl is-active --quiet "$SERVICE_NAME"; then
    print_status "ChainBot service is running"
else
    print_error "ChainBot service failed to start"
    systemctl status "$SERVICE_NAME"
    exit 1
fi

# Test health endpoint
print_status "Testing health endpoint..."
if curl -f -s "http://localhost:$CHAINBOT_PORT/health" > /dev/null; then
    print_status "Health endpoint is responding"
else
    print_warning "Health endpoint not responding yet"
fi

# Test ALEX OS connectivity
print_status "Testing ALEX OS connectivity..."
if curl -f -s "http://$ALEX_OS_HOST:$ALEX_OS_PORT" > /dev/null 2>&1; then
    print_status "ALEX OS is reachable"
else
    print_warning "ALEX OS is not reachable - check network connectivity"
fi

# Create monitoring script
print_status "Creating monitoring script..."
cat > "$CHAINBOT_DIR/monitor.sh" << 'EOF'
#!/bin/bash

# ChainBot Monitoring Script
echo "=== ChainBot Status ==="
systemctl status chainbot --no-pager

echo -e "\n=== Health Check ==="
curl -s http://localhost:9000/health | jq . 2>/dev/null || curl -s http://localhost:9000/health

echo -e "\n=== Logs (last 20 lines) ==="
journalctl -u chainbot -n 20 --no-pager

echo -e "\n=== System Resources ==="
free -h
df -h /
uptime
EOF

chmod +x "$CHAINBOT_DIR/monitor.sh"
chown "$USER_NAME:$USER_NAME" "$CHAINBOT_DIR/monitor.sh"

# Create environment file template
print_status "Creating environment file template..."
cat > "$CHAINBOT_DIR/.env.template" << EOF
# ChainBot Environment Variables
# Copy this file to .env and fill in your values

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# MacLink Configuration (optional)
MACLINK_API_KEY=your-maclink-api-key-here

# Security
SECRET_KEY=your-secret-key-here

# ALEX OS Configuration
ALEX_OS_REGISTRY_URL=http://$ALEX_OS_HOST:$ALEX_OS_PORT
ALEX_OS_EVENT_BUS_URL=ws://$ALEX_OS_HOST:$ALEX_OS_PORT/ws/events
ALEX_OS_WEBHOOK_URL=http://$(hostname -I | awk '{print $1}'):$CHAINBOT_PORT/api/webhooks/chainbot

# Database (optional - defaults to SQLite)
DATABASE_URL=sqlite:///./chainbot.db

# Logging
LOG_LEVEL=INFO
LOG_FILE=chainbot.log
EOF

chown "$USER_NAME:$USER_NAME" "$CHAINBOT_DIR/.env.template"

print_status "Deployment completed successfully!"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Copy $CHAINBOT_DIR/.env.template to $CHAINBOT_DIR/.env"
echo "2. Edit $CHAINBOT_DIR/.env with your API keys and configuration"
echo "3. Restart the service: sudo systemctl restart $SERVICE_NAME"
echo "4. Check status: sudo $CHAINBOT_DIR/monitor.sh"
echo "5. Access ChainBot at: http://$(hostname -I | awk '{print $1}'):$CHAINBOT_PORT"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  Check status: sudo systemctl status $SERVICE_NAME"
echo "  View logs: sudo journalctl -u $SERVICE_NAME -f"
echo "  Monitor: sudo $CHAINBOT_DIR/monitor.sh"
echo "  Health check: sudo $CHAINBOT_DIR/health_check.sh"
echo "  Restart: sudo systemctl restart $SERVICE_NAME"
echo ""
echo -e "${GREEN}ChainBot is now deployed and integrated with ALEX OS!${NC}" 