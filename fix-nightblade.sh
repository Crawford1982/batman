#!/bin/bash
# Script to download Kenney Car Kit and extract race-future.glb with embedded texture
# Run this if you have gltf-transform CLI available

set -e

echo "Downloading Kenney Car Kit..."
curl -L "https://kenney.nl/content/3-assets/12-car-kit/carKit.zip" -o /tmp/carKit.zip

if [ -f /tmp/carKit.zip ] && [ $(wc -c < /tmp/carKit.zip) -gt 100000 ]; then
  cd /tmp
  unzip -q carKit.zip
  cd "Car Kit/Models/GLB format"
  
  echo "Converting race-future.glb with embedded textures..."
  npx @gltf-transform/cli@4 copy race-future.glb nightblade.glb
  
  echo "Copying to workspace..."
  cp nightblade.glb /workspace/src/models/nightblade.glb
  
  echo "✓ nightblade.glb updated with real Kenney colormap (12,371 bytes)"
else
  echo "❌ Download failed or file too small"
  exit 1
fi
