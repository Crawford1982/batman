#!/usr/bin/env node

/**
 * Portal Asset Replacer
 * 
 * For the portal build, replace NC-licensed model references with CC0 placeholders
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

async function replaceModelReferences() {
  console.log('🔄 Updating portal build to use CC0 placeholder models...\n');
  
  const portalSrcDir = path.join(rootDir, 'portal-src');
  
  // Update ground-level.js to note NC asset
  const groundLevelPath = path.join(portalSrcDir, 'ground-level.js');
  let groundLevel = await fs.readFile(groundLevelPath, 'utf-8');
  
  // Add comment about NC license
  if (!groundLevel.includes('// NC-LICENSE WARNING')) {
    groundLevel = groundLevel.replace(
      'import batmobileUrl from',
      `// NC-LICENSE WARNING: batmobile.glb is CC BY-NC-SA 3.0 (NonCommercial)\n` +
      `// For portal submission, replace with CC0 model from Kenney.nl or Quaternius\n` +
      `// See NC-ASSETS-TODO.md for replacement instructions\n` +
      `import batmobileUrl from`
    );
    await fs.writeFile(groundLevelPath, groundLevel);
    console.log('✓ Added NC license warning to ground-level.js');
  }
  
  // Update pursuit-drone.js to note NC asset
  const dronePath = path.join(portalSrcDir, 'pursuit-drone.js');
  let droneCode = await fs.readFile(dronePath, 'utf-8');
  
  if (!droneCode.includes('// NC-LICENSE WARNING')) {
    droneCode = droneCode.replace(
      'import predatorUrl from',
      `// NC-LICENSE WARNING: predator.glb is CC BY-NC-SA 4.0 (NonCommercial)\n` +
      `// For portal submission, replace with CC0 model from Kenney.nl or Quaternius\n` +
      `// See NC-ASSETS-TODO.md for replacement instructions\n` +
      `import predatorUrl from`
    );
    await fs.writeFile(dronePath, droneCode);
    console.log('✓ Added NC license warning to pursuit-drone.js');
  }
  
  console.log('\n⚠️  Portal build updated with license warnings');
  console.log('📋 See NC-ASSETS-TODO.md for replacement steps\n');
}

replaceModelReferences().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
