#!/usr/bin/env bash
# Builds unsigned macOS apps (arm64 and x64 zips) from Windows: electron-builder only targets macOS
# on a Mac, so this packages the built client with @electron/packager inside a Linux container.
# Run from Git Bash after `npm run build && npm run transpile:electron`: deploy/build-mac.sh [output dir]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-D:/HereToSlay-build/mac}"
mkdir -p "$OUT"
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W):/src:ro" -v "$OUT:/out" node:20-bookworm bash /src/deploy/mac-package.sh
