/**
 * Test that all GLB models in dist-portal have embedded textures (no external image URIs)
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

test('portal GLB models must have embedded textures (no external image URIs)', () => {
  const distPortalPath = join(process.cwd(), 'dist-portal');
  
  // Skip test if dist-portal doesn't exist
  if (!existsSync(distPortalPath)) {
    console.log('⚠️  Skipping: dist-portal not found (run npm run build:portal first)');
    return;
  }
  
  const assetsPath = join(distPortalPath, 'assets');
  if (!existsSync(assetsPath)) {
    console.log('⚠️  Skipping: dist-portal/assets not found');
    return;
  }
  
  const files = readdirSync(assetsPath);
  const glbFiles = files.filter(f => f.endsWith('.glb'));
  
  assert.ok(glbFiles.length > 0, 'Expected at least one .glb file in dist-portal/assets');
  
  for (const glbFile of glbFiles) {
    const glbPath = join(assetsPath, glbFile);
    const buffer = readFileSync(glbPath);
    
    // Check if it's a valid GLB (starts with 'glTF' magic number)
    const magic = buffer.toString('utf8', 0, 4);
    assert.strictEqual(magic, 'glTF', `${glbFile}: Not a valid GLB file`);
    
    // Read JSON chunk
    const jsonChunkLength = buffer.readUInt32LE(12);
    const jsonChunkType = buffer.readUInt32LE(16);
    assert.strictEqual(jsonChunkType, 0x4E4F534A, `${glbFile}: Invalid JSON chunk type`); // 'JSON'
    
    const jsonData = buffer.toString('utf8', 20, 20 + jsonChunkLength);
    const gltf = JSON.parse(jsonData);
    
    // Check for external image URIs
    if (gltf.images) {
      for (let i = 0; i < gltf.images.length; i++) {
        const image = gltf.images[i];
        assert.ok(
          !image.uri || image.uri.startsWith('data:'),
          `${glbFile}: Image ${i} (${image.name || 'unnamed'}) has external URI: ${image.uri}. ` +
          `All textures must be embedded. Use gltf-transform to embed external textures.`
        );
      }
    }
  }
  
  console.log(`✓ Checked ${glbFiles.length} GLB files: all textures embedded`);
});
