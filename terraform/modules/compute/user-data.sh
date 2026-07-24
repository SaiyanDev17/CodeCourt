#!/bin/bash
# =============================================================================
# CodeCourt EC2 Bootstrap Script (user-data)
# =============================================================================
# This script runs ONCE on first boot of the EC2 instance.
# It installs Docker, clones the repo, builds judge images, and starts
# the entire stack via Docker Compose.
#
# Logs: /var/log/cloud-init-output.log
# =============================================================================
set -euxo pipefail

# ============================================================
# 1. Install Docker + Docker Compose + Git
# ============================================================
dnf update -y
dnf install -y docker git

# Enable and start Docker daemon
systemctl enable docker
systemctl start docker

# Add ec2-user to docker group (allows non-root docker commands)
usermod -aG docker ec2-user

# Install Docker Compose v2 plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# ============================================================
# 2. Clone CodeCourt Repository
# ============================================================
cd /home/ec2-user
git clone https://github.com/SaiyanDev17/CodeCourt.git app
chown -R ec2-user:ec2-user app
cd app

# ============================================================
# 3. Build Judge Docker Images (C++ and Python sandboxes)
# ============================================================
docker build -t codecourt-judge-cpp \
  -f backend/docker/judges/cpp/Dockerfile \
  backend/docker/judges/cpp/

docker build -t codecourt-judge-python \
  -f backend/docker/judges/python/Dockerfile \
  backend/docker/judges/python/

# ============================================================
# 4. Create Caddy Reverse Proxy Configuration
# ============================================================
# Caddy handles:
#   - Reverse proxying to all 3 services
#   - Auto-HTTPS via Let's Encrypt (if domain provided)
#   - HTTP → HTTPS redirect
#   - Gzip compression
#   - WebSocket proxying for Socket.io
# ============================================================

DOMAIN="${domain_name}"

if [ -z "$DOMAIN" ]; then
  # No domain: HTTP-only mode accessible via Elastic IP
  cat > Caddyfile <<'CADDY'
:80 {
    # Express Backend API
    handle /api/* {
        reverse_proxy api:5000
    }

    # Socket.io WebSocket connections
    handle /socket.io/* {
        reverse_proxy api:5000
    }

    # FastAPI AI Service
    handle /ai/* {
        reverse_proxy ai-service:8000
    }

    # Next.js Frontend (catch-all)
    handle {
        reverse_proxy frontend:3000
    }

    encode gzip

    log {
        output stdout
        format console
    }
}
CADDY
else
  # Domain provided: Caddy auto-provisions Let's Encrypt SSL (free)
  cat > Caddyfile <<CADDY
$DOMAIN {
    # Express Backend API
    handle /api/* {
        reverse_proxy api:5000
    }

    # Socket.io WebSocket connections
    handle /socket.io/* {
        reverse_proxy api:5000
    }

    # FastAPI AI Service
    handle /ai/* {
        reverse_proxy ai-service:8000
    }

    # Next.js Frontend (catch-all)
    handle {
        reverse_proxy frontend:3000
    }

    encode gzip

    log {
        output stdout
        format console
    }
}
CADDY
fi

# ============================================================
# 5. Create Production Docker Compose File
# ============================================================
# This compose file is specifically for the EC2 deployment.
# It differs from the dev compose in:
#   - Caddy reverse proxy in front of everything
#   - No port exposure except 80/443 (Caddy handles routing)
#   - Redis tuned for low memory (128MB)
#   - BullMQ concurrency reduced to 1 (1GB RAM instance)
#   - restart: unless-stopped for all services
#   - No MongoDB container (uses Atlas)
# ============================================================

cat > docker-compose.deploy.yml <<'COMPOSE'
services:
  # ── Caddy Reverse Proxy (Load Balancer + Auto-HTTPS) ──
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - frontend
      - api
      - ai-service
    networks:
      - codecourt-network
    restart: unless-stopped

  # ── Express.js Backend API ──
  api:
    build:
      context: ./backend
      dockerfile: docker/Dockerfile
    user: "0:0"
    environment:
      - PORT=5000
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - AI_SERVICE_URL=http://ai-service:8000
      - FRONTEND_URL=http://localhost
      - JUDGE_VOLUME_NAME=codecourt_judge_data
      - JUDGE_VOLUME_PATH=/judge-tmp
    env_file:
      - ./backend/.env
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - codecourt_judge_data:/judge-tmp
    depends_on:
      - redis
    networks:
      - codecourt-network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "2"

  # ── FastAPI AI Service ──
  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    environment:
      - PORT=8000
      - EXPRESS_API_URL=http://api:5000
    env_file:
      - ./ai-service/.env
    depends_on:
      - api
    networks:
      - codecourt-network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "2"

  # ── Next.js Frontend ──
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      - NEXT_PUBLIC_API_URL=/api
      - NEXT_PUBLIC_AI_URL=/ai
      - NEXT_PUBLIC_SOCKET_URL=/
    depends_on:
      - api
    networks:
      - codecourt-network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "2"

  # ── Redis (Caching + BullMQ Message Queue) ──
  redis:
    image: redis:alpine
    command: >
      redis-server
        --maxmemory 128mb
        --maxmemory-policy allkeys-lru
        --save 900 1
    volumes:
      - redis_data:/data
    networks:
      - codecourt-network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "3m"
        max-file: "2"

volumes:
  redis_data:
  caddy_data:
  caddy_config:
  codecourt_judge_data:

networks:
  codecourt-network:
    driver: bridge
COMPOSE

# ============================================================
# 6. Start the Stack
# ============================================================
docker compose -f docker-compose.deploy.yml up -d --build

echo "============================================"
echo "  CodeCourt deployment complete!"
echo "  Logs: docker compose -f docker-compose.deploy.yml logs -f"
echo "============================================"
