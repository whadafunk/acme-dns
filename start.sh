#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE="acme-dns:v2.0.2"
CONTAINER="acme-dns"

docker run -d \
    --name "$CONTAINER" \
    --restart unless-stopped \
    -p 53:53/tcp \
    -p 53:53/udp \
    -p 8053:80/tcp \
    -v "$SCRIPT_DIR/config.cfg:/etc/acme-dns/config.cfg:ro" \
    -v "$SCRIPT_DIR/data:/var/lib/acme-dns" \
    "$IMAGE"

echo "acme-dns started. Logs: docker logs -f $CONTAINER"
