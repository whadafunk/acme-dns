#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

API_IMAGE="acme-dns-gui-api:latest"
WEB_IMAGE="acme-dns-gui-web:latest"
API_CONTAINER="acme-dns-gui-api"
WEB_CONTAINER="acme-dns-gui-web"
NETWORK="acme-dns-gui"

docker build -t "$API_IMAGE" "$SCRIPT_DIR/backend"
docker build -t "$WEB_IMAGE" "$SCRIPT_DIR/frontend"

docker network create "$NETWORK" 2>/dev/null || true

docker run -d \
    --name "$API_CONTAINER" \
    --network "$NETWORK" \
    --add-host host.docker.internal:host-gateway \
    --restart unless-stopped \
    -p 3001:3001 \
    -v "$ROOT_DIR/data:/data" \
    -v "$ROOT_DIR/config.cfg:/config.cfg" \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -e ACME_DNS_URL=http://host.docker.internal:8053 \
    -e ACME_DNS_DB=/data/acme-dns.db \
    -e LABELS_FILE=/data/labels.json \
    -e ACME_DNS_CONFIG=/config.cfg \
    -e ACME_DNS_CONTAINER=acme-dns \
    "$API_IMAGE"

docker run -d \
    --name "$WEB_CONTAINER" \
    --network "$NETWORK" \
    --restart unless-stopped \
    -p 8080:80 \
    -e BACKEND_URL=http://${API_CONTAINER}:3001 \
    "$WEB_IMAGE"

echo "GUI started."
echo "  Web: http://localhost:8080"
echo "  API: http://localhost:3001"
