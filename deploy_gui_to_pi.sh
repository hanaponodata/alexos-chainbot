#!/bin/bash

set -e

PI_USER="alex"
PI_HOST="10.42.69.208"
PI_PORT="5420"
REMOTE_GUI_DIR="/opt/alexos/modules/chainbot/gui"
REMOTE_DIST_DIR="$REMOTE_GUI_DIR/dist"
NGINX_SITE_CONF="/etc/nginx/sites-available/chainbot_gui"
NGINX_SITE_LINK="/etc/nginx/sites-enabled/chainbot_gui"

# 1. Build the GUI
cd "$(dirname "$0")"
echo "Building GUI..."
npm run build

# 2. Copy dist to Pi
echo "Copying dist/ to Pi..."
scp -P $PI_PORT -r dist $PI_USER@$PI_HOST:$REMOTE_GUI_DIR/

# 3. Set up nginx config on Pi
ssh -p $PI_PORT $PI_USER@$PI_HOST "sudo bash -s" <<'ENDSSH'
set -e

NGINX_SITE_CONF="/etc/nginx/sites-available/chainbot_gui"
NGINX_SITE_LINK="/etc/nginx/sites-enabled/chainbot_gui"
REMOTE_DIST_DIR="/opt/alexos/modules/chainbot/gui/dist"

if ! dpkg -l | grep -q nginx; then
  echo "Installing nginx..."
  sudo apt update && sudo apt install -y nginx
fi

if [ ! -f "$NGINX_SITE_CONF" ]; then
  echo "Creating nginx site config..."
  sudo tee $NGINX_SITE_CONF > /dev/null <<EOF
server {
    listen 9001;
    server_name _;
    root $REMOTE_DIST_DIR;
    index index.html;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
}
EOF
fi

if [ ! -L "$NGINX_SITE_LINK" ]; then
  sudo ln -s $NGINX_SITE_CONF $NGINX_SITE_LINK
fi

sudo nginx -t
sudo systemctl reload nginx
ENDSSH

echo "GUI deployed and nginx reloaded. Access it at http://$PI_HOST:9001/" 