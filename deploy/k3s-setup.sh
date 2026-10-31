#!/usr/bin/env bash
# One-time setup of the game server for k3s. Run it ON the server as root:
#   ssh <server> 'bash -s' < deploy/k3s-setup.sh
# k3s runs lean here: no Traefik (the host's nginx keeps TLS and the site), no built-in load
# balancer (nothing is exposed through k3s) and no metrics-server. Swap stays on, so the kubelet
# is told not to refuse it. The API server (6443) stays closed by the host firewall.
set -euo pipefail

mkdir -p /etc/rancher/k3s
cat > /etc/rancher/k3s/config.yaml <<'EOF'
write-kubeconfig-mode: "0600"
disable:
  - traefik
  - servicelb
  - metrics-server
kubelet-arg:
  - "fail-swap-on=false"
EOF

curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=stable sh -
until kubectl get nodes >/dev/null 2>&1; do sleep 2; done
kubectl get nodes
