# Nightblade Texture Fix Required

The current nightblade.glb has a hand-made colormap (6.7 KB). 
For proper blue car rendering, replace with Kenney's real texture:

## Manual Fix Steps

1. Download Kenney Car Kit: https://kenney.nl/assets/car-kit
2. Extract the zip
3. Navigate to `Car Kit/Models/GLB format/`
4. Run: `npx @gltf-transform/cli@4 copy race-future.glb nightblade.glb`
5. Copy the output `nightblade.glb` (should be ~177 KB with 12,371-byte embedded colormap) to `src/models/nightblade.glb`

The geometry is identical (same accessor counts, same translations), 
only the embedded texture changes.

Alternatively, run the included `./fix-nightblade.sh` script if you can 
download the Kenney kit successfully.
