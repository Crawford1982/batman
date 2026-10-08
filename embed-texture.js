const fs = require('fs');

// Read files
const glb = fs.readFileSync('src/models/nightblade.glb');
const colormap = fs.readFileSync('/tmp/kenney-car/colormap.png');

console.log(`GLB size: ${glb.length}, Colormap size: ${colormap.length}`);

// Parse GLB
const jsonLength = glb.readUInt32LE(12);
const jsonData = JSON.parse(glb.toString('utf8', 20, 20 + jsonLength));

// Get binary data
const binaryStart = 20 + jsonLength + 8;
const binaryLength = glb.readUInt32LE(20 + jsonLength);
const binaryData = glb.subarray(binaryStart, binaryStart + binaryLength);

// Modify JSON
if (jsonData.images && jsonData.images[0]) {
  delete jsonData.images[0].uri;
  jsonData.images[0].bufferView = jsonData.bufferViews.length;
  jsonData.images[0].mimeType = 'image/png';
}

// Add bufferView for image
jsonData.bufferViews.push({
  buffer: 0,
  byteOffset: binaryLength,
  byteLength: colormap.length
});

jsonData.buffers[0].byteLength = binaryLength + colormap.length;

// Build new GLB
const newJsonStr = JSON.stringify(jsonData);
const newJsonBuffer = Buffer.from(newJsonStr, 'utf8');
const jsonPadding = (4 - (newJsonBuffer.length % 4)) % 4;
const paddedJsonLength = newJsonBuffer.length + jsonPadding;

const newBinaryData = Buffer.concat([binaryData, colormap]);
const binaryPadding = (4 - (newBinaryData.length % 4)) % 4;
const paddedBinaryLength = newBinaryData.length + binaryPadding;

const totalLength = 12 + 8 + paddedJsonLength + 8 + paddedBinaryLength;
const output = Buffer.alloc(totalLength);
let offset = 0;

// Header
output.write('glTF', offset); offset += 4;
output.writeUInt32LE(2, offset); offset += 4;
output.writeUInt32LE(totalLength, offset); offset += 4;

// JSON chunk
output.writeUInt32LE(paddedJsonLength, offset); offset += 4;
output.writeUInt32LE(0x4E4F534A, offset); offset += 4;
newJsonBuffer.copy(output, offset); offset += newJsonBuffer.length;
for (let i = 0; i < jsonPadding; i++) output.write(' ', offset++);

// Binary chunk
output.writeUInt32LE(paddedBinaryLength, offset); offset += 4;
output.writeUInt32LE(0x004E4942, offset); offset += 4;
newBinaryData.copy(output, offset); offset += newBinaryData.length;

fs.writeFileSync('src/models/nightblade.glb', output);
console.log(`✓ Created nightblade.glb: ${output.length} bytes`);
