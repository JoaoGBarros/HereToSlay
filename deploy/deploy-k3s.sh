#!/usr/bin/env bash
# Deploys HtS Online to the k3s server:
#   1. builds the backend jar, its runtime image and the accounts API image locally (Docker),
#   2. imports the images straight into the server's k3s (no registry),
#   3. applies the manifests in k8s/ with that image tag and waits for the rollout,
#   4. publishes the web client to the folder the server's nginx serves.
# Run from Git Bash: deploy/deploy-k3s.sh   (needs the SSH key loaded in the Windows ssh-agent)
# The server address lives in deploy/.env.deploy, which git ignores (see deploy/.env.deploy.example).
# The accounts-secrets Secret must exist on the server first (see k8s/accounts-api.yaml).
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f deploy/.env.deploy ] && . deploy/.env.deploy
: "${HOST:?Set HOST (user@server) in deploy/.env.deploy}"
WEB="${WEB:-/var/www/heretoslay}"
# Windows' own ssh talks to the Windows ssh-agent; Git Bash's ssh does not.
SSH="${SSH:-/c/Windows/System32/OpenSSH/ssh.exe}"
TAG="$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M%S)"

OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

# Every service runs from the same jar, so build it once and ship one image.
docker compose build gateway
id="$(docker create heretoslay-gateway)"
docker cp "$id:/app/app.jar" "$OUT/app.jar" >/dev/null
docker rm "$id" >/dev/null
cp deploy/Dockerfile.runtime "$OUT/Dockerfile"
docker build -q -t "heretoslay-backend:$TAG" "$OUT" >/dev/null
docker save "heretoslay-backend:$TAG" | "$SSH" "$HOST" "k3s ctr images import - >/dev/null"

# The accounts API has its own image (Spring Boot), tagged the same way.
docker build -q -t "heretoslay-accounts-api:$TAG" accounts-api >/dev/null
docker save "heretoslay-accounts-api:$TAG" | "$SSH" "$HOST" "k3s ctr images import - >/dev/null"

npm run build
mkdir -p "$OUT/bundle"
cp -r k8s "$OUT/bundle/k8s"
cp -r dist "$OUT/bundle/web"
sed -i "s/newTag: .*/newTag: $TAG/" "$OUT/bundle/k8s/kustomization.yaml"

tar czf - -C "$OUT/bundle" . | "$SSH" "$HOST" "set -e
    T=\$(mktemp -d) && tar xzf - -C \$T
    # A Job's spec cannot change once created; recreate the topics job so new topics get made.
    kubectl -n heretoslay delete job kafka-topics --ignore-not-found
    kubectl apply -k \$T/k8s
    for d in gateway lobby game-engine monitoring accounts-api; do kubectl -n heretoslay rollout status deployment/\$d --timeout=300s; done
    mkdir -p $WEB && find $WEB -mindepth 1 -delete && cp -r \$T/web/. $WEB/
    rm -rf \$T
    kubectl -n heretoslay get pods"
echo "Deployed heretoslay-backend:$TAG"
