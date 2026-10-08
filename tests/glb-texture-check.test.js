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
        
        // If image is embedded via bufferView, validate it's a real image
        if (image.bufferView !== undefined) {
          const bufferView = gltf.bufferViews[image.bufferView];
          assert.ok(bufferView, `${glbFile}: Image ${i} references missing bufferView ${image.bufferView}`);
          
          // Read binary chunk to get image data
          const binaryChunkStart = 20 + jsonChunkLength + 8; // after JSON chunk header
          const imageStart = binaryChunkStart + bufferView.byteOffset;
          const imageData = buffer.subarray(imageStart, imageStart + bufferView.byteLength);
          
          assert.ok(
            imageData.length >= 100,
            `${glbFile}: Image ${i} is only ${imageData.length} bytes (likely a stub). ` +
            `Embedded images must be valid PNG/JPEG files.`
          );
          
          // Check PNG or JPEG signature
          const isPNG = imageData[0] === 0x89 && imageData[1] === 0x50 && imageData[2] === 0x4E && imageData[3] === 0x47;
          const isJPEG = imageData[0] === 0xFF && imageData[1] === 0xD8 && imageData[2] === 0xFF;
          
          assert.ok(
            isPNG || isJPEG,
            `${glbFile}: Image ${i} is not a valid PNG or JPEG (first 4 bytes: ${Array.from(imageData.subarray(0, 4)).map(b => '0x' + b.toString(16)).join(' ')})`
          );
          
          // For PNG, check dimensions are at least 16x16
          if (isPNG) {
            const width = imageData.readUInt32BE(16);
            const height = imageData.readUInt32BE(20);
            assert.ok(
              width >= 16 && height >= 16,
              `${glbFile}: Image ${i} dimensions ${width}x${height} are too small (minimum 16x16)`
            );
          }
        }
      }
    }
  }
  
  console.log(`✓ Checked ${glbFiles.length} GLB files: all textures embedded and valid`);
});
