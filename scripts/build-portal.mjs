#!/usr/bin/env node

/**
 * Portal Build Script
 * 
 * Creates an IP-free version of the game for HTML5 game portal submission.
 * Replaces all Batman/DC references with original theme.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const portalSrcDir = path.join(rootDir, 'portal-src');

// Theme replacements (IP-free)
const TEXT_REPLACEMENTS = {
  // Aircraft (in UI text only)
  'Batwing': 'Shadow Striker',
  'BATWING': 'SHADOW STRIKER',
  // NOTE: lowercase 'batwing' is handled separately in Step 4 to avoid breaking imports
  
  // Vehicle (in UI text only)  
  'Batmobile': 'Nightblade',
  'BATMOBILE': 'NIGHTBLADE',
  // NOTE: lowercase 'batmobile' is handled separately in Step 4
  
  // Base/HQ
  'Batcave': 'Headquarters',
  'BATCAVE': 'HEADQUARTERS',
  // NOTE: lowercase 'batcave' is handled separately in Step 4
  'Batcomputer': 'Command Terminal',
  'BATCOMPUTER': 'COMMAND TERMINAL',
  
  // City
  'Gotham City': 'Steel City',
  'Gotham': 'Steel City',
  'GOTHAM CITY': 'STEEL CITY',
  'GOTHAM': 'STEEL CITY',
  
  // Districts
  'OLD GOTHAM': 'OLD QUARTER',
  'Old Gotham': 'Old Quarter',
  'TRICORNER DOCKS': 'RIVERSIDE DOCKS',
  'Tricorner Docks': 'Riverside Docks',
  'GOTHAM RIVER': 'CENTRAL RIVER',
  'Gotham River': 'Central River',
  
  // Landmarks
  'WAYNE TOWER': 'VANGUARD TOWER',
  'Wayne Tower': 'Vanguard Tower',
  'TRICORNER SUBSTATION': 'RIVERSIDE SUBSTATION',
  
  // Organization
  'Wayne Aerospace': 'Vanguard Systems',
  'WAYNE AEROSPACE': 'VANGUARD SYSTEMS',
  'Wayne': 'Apex',
  'WAYNE': 'APEX',
  'EXPERIMENTAL DIVISION': 'TACTICAL DIVISION',
  
  // Characters
  'Batman': 'THE OPERATIVE',
  'BATMAN': 'THE OPERATIVE',
  'Alfred': 'HANDLER',
  'ALFRED': 'HANDLER',
  'Gordon': 'CHIEF REEVES',
  'GORDON': 'CHIEF REEVES',
  
  // Voice file references - replace alfred-/gordon- with handler-/reeves-
  'alfred-': 'handler-',
  'gordon-': 'reeves-',
  'batman-air': 'striker-air',
  'batman-drive': 'nightblade-drive',
  
  // Standalone voice character IDs (must come after prefixed versions to avoid double replacement)
  '"alfred"': '"handler"',
  '"gordon"': '"reeves"',
  
  // Misc
  'Batman 1989': 'Shadow Striker',
  'WINTER, 1989': 'WINTER',
  'Preparing Gotham…': 'Preparing mission…',
  'Gotham can wait a moment': 'The city can wait a moment',
  'Gotham navigation map': 'Navigation map',
  'GOTHAM NAVIGATION': 'NAVIGATION',
};

async function replaceTextInFile(filePath, replacements) {
  let content = await fs.readFile(filePath, 'utf-8');
  
  // Simple replacement for HTML/CSS files
  for (const [oldText, newText] of Object.entries(replacements)) {
    const regex = new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    content = content.replace(regex, newText);
  }
  
  return content;
}

async function copyAndReplaceDirectory(srcDir, destDir, replacements) {
  await fs.mkdir(destDir, { recursive: true });
  
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    
    if (entry.isDirectory()) {
      await copyAndReplaceDirectory(srcPath, destPath, replacements);
    } else if (entry.isFile()) {
      // Do text replacement in HTML, CSS, and JS files
      if (entry.name.match(/\.(html|css|js)$/)) {
        const content = await replaceTextInFile(srcPath, replacements);
        await fs.writeFile(destPath, content);
      } else {
        // All other files, just copy
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

async function createPortalCredits() {
  const credits = `# Shadow Striker: Steel City - Asset Licensing

All assets in this portal build are cleared for commercial use (ad-supported game portals).

## ✅ Aircraft Model - Shadow Striker

**Model:** \`striker-interceptor.glb\` (originally \`craft_racer.glb\` from Kenney Space Kit 2.0)  
**Author:** Kenney  
**Source:** https://kenney.nl/assets/space-kit  
**License:** CC0 1.0 (Public Domain)  
**Modifications:** Renamed file for thematic consistency

**Commercial use:** ✅ **Permitted**

## ✅ Vehicle Model - Nightblade

**Model:** \`nightblade.glb\` (originally \`vehicle-race-future.glb\` from Kenney Car Kit 3.1)  
**Author:** Kenney  
**Source:** https://kenney.nl/assets/car-kit  
**License:** CC0 1.0 (Public Domain)  
**Modifications:** Renamed file for thematic consistency

**Commercial use:** ✅ **Permitted**

## ✅ Drone Model - Surveillance Drone

**Model:** \`surveillance-drone.glb\` (originally \`craft_speederA.glb\` from Kenney Space Kit 2.0)  
**Author:** Kenney  
**Source:** https://kenney.nl/assets/space-kit  
**License:** CC0 1.0 (Public Domain)  
**Modifications:** Renamed file for thematic consistency

**Commercial use:** ✅ **Permitted**

## ✅ Character Models

**Models:** Player character and guard models  
**Author:** Quaternius  
**Source:** https://quaternius.com  
**License:** CC0 1.0 (Public Domain)  
**Modifications:** Custom textures, animation cleanup, reduced keyframes

**Commercial use:** ✅ **Permitted**

## ✅ Environment Assets

**Models and Textures:** City buildings, rooftop props, cave kit, textures, HDR  
**Authors:** Quaternius (city), Poly Haven contributors (props, textures, HDR)  
**Sources:**
- https://quaternius.com/packs/downtowncitymegakit.html
- https://polyhaven.com

**License:** CC0 1.0 (Public Domain)  
**Modifications:** Reduced geometry, resized textures, combined materials, nighttime treatment

**Commercial use:** ✅ **Permitted**

---

## IP-Free Theme

This portal build uses an original noir/urban vigilante theme ("Shadow Striker: Steel City") with no copyrighted character names, story elements, or trademarked designs from DC Comics, Warner Bros, or any other IP holder.

All dialogue, character names, and mission text have been rewritten to remove Batman/DC references.

---

## Full Attribution

For complete per-asset attribution and credits, see the generated \`ASSET-LICENSING.md\` files in the build output.

**License Summary:**  
All assets in \`shadow-striker-portal.zip\` are either CC0 (public domain) or created for this project, and are cleared for commercial use including ad-supported game portal distribution.
`;

  await fs.writeFile(path.join(rootDir, 'portal', 'ASSET-LICENSING.md'), credits);
}

async function main() {
  console.log('🎮 Building Portal Version...\n');
  
  // Step 1: Clean and create portal-src directory
  console.log('📁 Creating portal-src directory...');
  try {
    await fs.rm(portalSrcDir, { recursive: true });
  } catch (e) {
    // Directory might not exist, that's OK
  }
  await fs.mkdir(portalSrcDir, { recursive: true });
  
  // Step 2: Copy and replace src files
  console.log('📝 Copying and replacing text in source files...');
  await copyAndReplaceDirectory(
    path.join(rootDir, 'src'),
    portalSrcDir,
    TEXT_REPLACEMENTS
  );
  
  // Step 3: Replace IP-encumbered models with CC0 alternatives
  console.log('🎨 Replacing models with CC0 versions...');
  const modelsDir = path.join(portalSrcDir, 'models');
  
  // Remove old IP models
  await fs.unlink(path.join(modelsDir, 'batmobile.glb')).catch(() => {});
  await fs.unlink(path.join(modelsDir, 'batwing.glb')).catch(() => {});
  await fs.unlink(path.join(modelsDir, 'predator.glb')).catch(() => {});
  
  // Copy CC0 replacement models from src/models
  const ccModels = {
    'striker-interceptor.glb': 'striker-interceptor.glb',
    'nightblade.glb': 'nightblade.glb',
    'surveillance-drone.glb': 'surveillance-drone.glb'
  };
  
  let missingModels = [];
  for (const [src, dest] of Object.entries(ccModels)) {
    const srcPath = path.join(rootDir, 'src', 'models', src);
    const destPath = path.join(modelsDir, dest);
    try {
      await fs.copyFile(srcPath, destPath);
      console.log(`   ✓ Copied ${src}`);
    } catch (err) {
      console.error(`   ✗ Missing required CC0 model: ${src}`);
      missingModels.push(src);
    }
  }
  
  // Exit with error if any CC0 models are missing
  if (missingModels.length > 0) {
    console.error('\n❌ Portal build FAILED: Missing required CC0 models');
    console.error('   The following models must be present in src/models/:');
    missingModels.forEach(m => console.error(`   - ${m}`));
    console.error('\n   These are Kenney CC0 models required for commercial use.');
    console.error('   The portal build cannot proceed without them.\n');
    process.exit(1);
  }
  
  // Step 4: Update model imports in JS files
  console.log('🔧 Updating model imports...');
  const jsFiles = ['main.js', 'ground-level.js', 'pursuit-drone.js'];
  for (const file of jsFiles) {
    const filePath = path.join(portalSrcDir, file);
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      content = content
        .replace(/batwingUrl/g, 'strikerUrl')
        .replace(/from\s+["']\.\/models\/batwing\.glb/g, 'from "./models/striker-interceptor.glb')
        .replace(/batmobileUrl/g, 'nightbladeUrl')
        .replace(/from\s+["']\.\/models\/batmobile\.glb/g, 'from "./models/nightblade.glb')
        .replace(/predatorUrl/g, 'droneUrl')
        .replace(/from\s+["']\.\/models\/predator\.glb/g, 'from "./models/surveillance-drone.glb')
        .replace(/"batwing"/g, '"striker"')
        .replace(/"batmobile"/g, '"nightblade"')
        .replace(/"predator"/g, '"drone"')
        .replace(/"batcave"/g, '"headquarters"')
        .replace(/window\.__batwing/g, 'window.__striker')
        .replace(/"batman-air"/g, '"striker-air"')
        .replace(/"batman-drive"/g, '"nightblade-drive"')
        .replace(/batman-air/g, 'striker-air')
        .replace(/batman-drive/g, 'nightblade-drive')
        .replace(/"batman"/g, '"striker"')
        .replace(/voice:\s*"batman"/g, 'voice: "striker"');
      await fs.writeFile(filePath, content);
    } catch (err) {
      console.warn(`⚠️  Could not update ${file}:`, err.message);
    }
  }
  
  // Update feedback.js
  const feedbackPath = path.join(portalSrcDir, 'feedback.js');
  try {
    let content = await fs.readFile(feedbackPath, 'utf-8');
    content = content
      .replace(/"nightblade"\s*\?\s*"batman-drive"\s*:\s*"batman-air"/g, '"nightblade" ? "nightblade-drive" : "striker-air"')
      .replace(/"batman-air"/g, '"striker-air"')
      .replace(/"batman-drive"/g, '"nightblade-drive"');
    await fs.writeFile(feedbackPath, content);
  } catch (err) {
    console.warn('⚠️  Could not update feedback.js');
  }
  
  // Update audio.js
  const audioPath = path.join(portalSrcDir, 'audio.js');
  try {
    let content = await fs.readFile(audioPath, 'utf-8');
    content = content
      .replace(/reply\s*=\s*"batman-air"/g, 'reply = "striker-air"')
      .replace(/reply\s*=\s*"batman-drive"/g, 'reply = "nightblade-drive"')
      .replace(/"batman"/g, '"striker"');
    await fs.writeFile(audioPath, content);
  } catch (err) {
    console.warn('⚠️  Could not update audio.js');
  }
  
  // Update radio-lines.js
  const radioPath = path.join(portalSrcDir, 'radio-lines.js');
  try {
    let content = await fs.readFile(radioPath, 'utf-8');
    content = content
      .replace(/"batman-air":/g, '"striker-air":')
      .replace(/"batman-drive":/g, '"nightblade-drive":')
      .replace(/\["BATMAN",/g, '["THE OPERATIVE",');
    await fs.writeFile(radioPath, content);
  } catch (err) {
    console.warn('⚠️  Could not update radio-lines.js');
  }
  
  // Update best-times.js - fix localStorage keys
  const bestTimesPath = path.join(portalSrcDir, 'best-times.js');
  try {
    let content = await fs.readFile(bestTimesPath, 'utf-8');
    content = content
      .replace(/"gotham-best-results"/g, '"steel-city-best-results"')
      .replace(/"gotham-best-"/g, '"steel-city-best-"')
      .replace(/"batwing"/g, '"striker"')
      .replace(/"batmobile"/g, '"nightblade"')
      .replace(/"batcave"/g, '"headquarters"');
    await fs.writeFile(bestTimesPath, content);
  } catch (err) {
    console.warn('⚠️  Could not update best-times.js');
  }
  
  // Update any remaining files with chapter/level names
  const moreFiles = ['cave-level.js', 'rooftop-level.js', 'mission.js', 'feedback.js', 'presentation.js', 'ground-level.js', 'main.js'];
  for (const file of moreFiles) {
    const filePath = path.join(portalSrcDir, file);
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      content = content
        .replace(/"batwing"/g, '"striker"')
        .replace(/"batmobile"/g, '"nightblade"')
        .replace(/"batcave"/g, '"headquarters"')
        .replace(/chapter === "batcave"/g, 'chapter === "headquarters"')
        .replace(/chapter === "batwing"/g, 'chapter === "striker"')
        .replace(/chapter === "batmobile"/g, 'chapter === "nightblade"')
        .replace(/gothamAnalytics/g, 'portalAnalytics')
        .replace(/localStorage\.setItem\("gotham-/g, 'localStorage.setItem("portal-')
        .replace(/localStorage\.getItem\("gotham-/g, 'localStorage.getItem("portal-')
        .replace(/voice:\s*"batman"/g, 'voice: "striker"');
      await fs.writeFile(filePath, content);
    } catch (err) {
      // File might not exist, that's OK
    }
  }
  
  // Step 5: Update TIME_LIMITS and other object keys
  const presentationPath = path.join(portalSrcDir, 'presentation.js');
  try {
    let content = await fs.readFile(presentationPath, 'utf-8');
    content = content
      .replace(/batwing:/g, 'striker:')
      .replace(/batmobile:/g, 'nightblade:')
      .replace(/batcave:/g, 'headquarters:');
    await fs.writeFile(presentationPath, content);
  } catch (err) {
    console.warn('⚠️  Could not update presentation.js');
  }
  
  // Step 6: Create asset licensing documentation
  console.log('📄 Creating asset licensing documentation...');
  await createPortalCredits();
  
  console.log('\n✅ Portal source files prepared in portal-src/');
  console.log('\n⚠️  IMPORTANT: Review portal/ASSET-LICENSING.md');
  console.log('   NonCommercial assets MUST be replaced before portal submission!\n');
  console.log('Next steps:');
  console.log('  1. Review generated files in portal-src/');
  console.log('  2. Run: npm run build:portal:vite');
  console.log('  3. Test the build in dist-portal/');
}

main().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
