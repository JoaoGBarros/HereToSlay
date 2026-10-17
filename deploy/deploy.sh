#!/usr/bin/env bash
# Builds the backend jar and the web client locally, sends them to the game server, then
# (re)starts the backend containers there and publishes the site served by the server's nginx.
# Run from Git Bash: deploy/deploy.sh   (needs the SSH key loaded in the Windows ssh-agent)
set -euo pipefail

HOST="${HOST:-root@167.71.23.107}"
DIR="${DIR:-/opt/heretoslay}"
WEB="${WEB:-/var/www/heretoslay}"
# Windows' own ssh talks to the Windows ssh-agent; Git Bash's ssh does not.
SSH="${SSH:-/c/Windows/System32/OpenSSH/ssh.exe}"

cd "$(dirname "$0")/.."
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

# Every service runs from the same jar, so build it once and ship it once.
docker compose build gateway
id="$(docker create heretoslay-gateway)"
docker cp "$id:/app/app.jar" "$OUT/app.jar" >/dev/null
docker rm "$id" >/dev/null

npm run build
cp deploy/docker-compose.prod.yml deploy/Dockerfile.runtime nginx/nginx.conf "$OUT/"
cp -r dist "$OUT/web"

tar czf - -C "$OUT" . | "$SSH" "$HOST" "set -e
    mkdir -p $DIR && cd $DIR && rm -rf web && tar xzf -
    mkdir -p $WEB && find $WEB -mindepth 1 -delete && cp -r web/. $WEB/
    docker build -q -t heretoslay-backend -f Dockerfile.runtime .
    docker compose -f docker-compose.prod.yml up -d --force-recreate --remove-orphans
    docker restart game-load-balancer >/dev/null
    docker compose -f docker-compose.prod.yml ps --format '{{.Name}}\t{{.Status}}'"
