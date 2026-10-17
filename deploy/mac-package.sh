#!/bin/bash
# Packages the already-built web client and Electron main process as macOS apps (arm64 and x64), unsigned.
set -euo pipefail
apt-get update -qq >/dev/null && apt-get install -y -qq zip icnsutils >/dev/null
mkdir -p /work/app /out
cd /work
cp -r /src/dist /src/dist-electron app/
node -e "const p=require('/src/package.json'); const o={name:p.name,productName:'Here to Slay',version:p.version,type:p.type,main:p.main}; require('fs').writeFileSync('app/package.json', JSON.stringify(o,null,2))"
png2icns icon.icns /src/public/icon.png >/dev/null
npx --yes @electron/packager@18 app "Here to Slay" --platform=darwin --arch=arm64,x64 --electron-version=37.4.0 \
  --icon=icon.icns --asar --app-bundle-id=com.jgbarros.heretoslay --out=/work/build --overwrite --quiet
for arch in arm64 x64; do
  (cd "/work/build/Here to Slay-darwin-$arch" && zip -qry "/out/HereToSlay-1.0.0-mac-$arch.zip" "Here to Slay.app")
done
ls -la /out
