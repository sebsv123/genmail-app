#!/bin/bash
# ============================================================================
# GenMail VPS Setup Script for Ubuntu 22.04
# Run this on a fresh VPS to prepare for GenMail deployment
# ============================================================================

set -e

DOMAIN_AI="ai.genmail.app"
DOMAIN_MAIL="mail.genmail.app"
EMAIL="admin@genmail.app"
INSTALL_DIR="/opt/genmail"

echo "🚀 GenMail VPS Setup Script"
echo "======================================"

# Update system
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt-get install -y \
    git \
    curl \
    wget \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    nginx \
    certbot \
    python3-certbot-nginx

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker $USER
    systemctl enable docker
    systemctl start docker
    rm get-docker.sh
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi

# Create installation directory
echo "📁 Creating installation directory..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Clone repository
echo "📥 Cloning GenMail repository..."
if [ ! -d ".git" ]; then
    git clone https://github.com/sebsv123/genmail-app.git .
else
    echo "Repository already exists, skipping clone"
fi

# Create environment file from template
echo "🔐 Creating environment file..."
if [ ! -f ".env.production" ]; then
    cp .env.production.example .env.production
    echo "⚠️  IMPORTANT: Edit $INSTALL_DIR/.env.production with your production values!"
    echo "   Required: DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET, GOOGLE_*"
fi

# Setup SSL with Let's Encrypt
echo "🔒 Setting up SSL certificates..."

# Create temporary nginx config for certbot
mkdir -p /var/www/certbot
cat > /etc/nginx/sites-available/genmail << 'EOF'
server {
    listen 80;
    server_name ai.genmail.app mail.genmail.app;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 404;
    }
}
EOF

ln -sf /etc/nginx/sites-available/genmail /etc/nginx/sites-enabled/genmail
rm -f /etc/nginx/sites-enabled/default

# Obtain certificates
echo "📜 Obtaining SSL certificates..."
certbot certonly --nginx -d $DOMAIN_AI -d $DOMAIN_MAIL --agree-tos --non-interactive --email $EMAIL || true

# Setup SSL auto-renewal cron
echo "🔄 Setting up SSL auto-renewal..."
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# Create systemd service for GenMail
echo "⚙️  Creating systemd service..."
cat > /etc/systemd/system/genmail.service << EOF
[Unit]
Description=GenMail Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/docker compose -f infra/docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f infra/docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable genmail

echo ""
echo "======================================"
echo "✅ VPS Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Edit $INSTALL_DIR/.env.production with your production values"
echo "2. Run: cd $INSTALL_DIR && docker compose -f infra/docker-compose.prod.yml up -d"
echo "3. Setup complete SSL: certbot --nginx -d ai.genmail.app -d mail.genmail.app"
echo ""
echo "Useful commands:"
echo "  - Start:    sudo systemctl start genmail"
echo "  - Stop:     sudo systemctl stop genmail"
echo "  - Logs:     docker logs -f genmail-worker"
echo "  - Restart:  docker compose -f infra/docker-compose.prod.yml restart"
echo ""
