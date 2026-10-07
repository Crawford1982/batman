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
  // DO NOT replace these - they're model filenames and URLs, handled separately
  // 'batwing.glb': 'shadow-striker.glb',
  // 'batmobile.glb': 'nightblade.glb',
  
  // Aircraft (in UI text only)
  'Batwing': 'Shadow Striker',
  'BATWING': 'SHADOW STRIKER',
  // Skip 'batwing' to avoid breaking batwingUrl variable
  
  // Vehicle (in UI text only)  
  'Batmobile': 'Nightblade',
  'BATMOBILE': 'NIGHTBLADE',
  // Skip 'batmobile' to avoid breaking batmobileUrl variable
  
  // Base/HQ
  'Batcave': 'Headquarters',
  'BATCAVE': 'HEADQUARTERS',
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
  'EXPERIMENTAL DIVISION': 'TACTICAL DIVISION',
  // Be careful with 'Wayne' - appears in variable names
  
  // Characters
  'Batman': 'THE OPERATIVE',
  'BATMAN': 'THE OPERATIVE',
  'Alfred': 'HANDLER',
  'ALFRED': 'HANDLER',
  'Gordon': 'CHIEF REEVES',
  'GORDON': 'CHIEF REEVES',
  
  // Misc
  ', 1989': '',
  ' 1989': '',
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
      // Only do text replacement in HTML and CSS files
      // JS files are copied as-is to avoid breaking code
      if (entry.name.match(/\.(html|css)$/)) {
        const content = await replaceTextInFile(srcPath, replacements);
        await fs.writeFile(destPath, content);
      } else {
        // All other files (including .js), just copy
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

async function createPortalCredits() {
  const credits = `# Asset Credits - Portal Version

## Important Asset Licensing Note

⚠️ **NonCommercial (NC) Licensed Assets**

The following assets are licensed under Creative Commons NonCommercial licenses and **CANNOT** be used in commercial contexts (including ad-supported game portals):

1. **Vehicle Model** (Batmobile → Nightblade)
   - Source: visnik's "89 Batmobile" from Blend Swap
   - License: CC BY-NC-SA 3.0
   - **Action Required**: Replace with CC0, CC-BY or commercially-licensed vehicle model

2. **Drone Model** (Predator UAV)
   - Source: VTX's "General Atomics MQ-1 Predator UAV" from Sketchfab
   - License: CC BY-NC-SA 4.0
   - **Action Required**: Replace with CC0, CC-BY or commercially-licensed drone model

## Commercial-OK Assets

The following assets ARE suitable for commercial use:

### Aircraft Model
- **Bat-Wing 1989** by The WarVet
- License: CC BY 4.0 (commercial OK with attribution)
- Source: Sketchfab
- Note: Display base removed, retextured to remove any DC/Batman branding

### Character Models
- **Quaternius** "Animated Human" characters
- License: CC0 1.0 (public domain, commercial OK)
- Used for: Player and guard models

### Environment Assets
- **Quaternius** Downtown City MegaKit
- **Poly Haven** assets (rocks, props, textures)
- License: CC0 1.0 (public domain, commercial OK)

## Recommendations for Portal Submission

To make this game fully portal-ready with ad revenue, you must:

1. **Replace the vehicle model** with:
   - A CC0 or CC-BY licensed model from sources like:
     - Poly Haven (https://polyhaven.com)
     - Quaternius (https://quaternius.com)
     - Kenney Assets (https://kenney.nl)
   - OR create a simple procedural vehicle model
   - OR commission an original model

2. **Replace the drone model** with:
   - A CC0 or CC-BY licensed drone/aircraft model
   - OR create procedural enemy aircraft
   - OR commission original models

3. **Verify aircraft model** doesn't contain trademarked Batman imagery:
   - Check textures for bat symbols
   - Check geometry for Batman-specific features
   - Retexture or modify as needed

## Full Asset List

See the original \`public/credits.html\` for complete attribution of all assets.
All Poly Haven and Quaternius assets are confirmed CC0 and commercial-OK.
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
  
  // Step 3: Create asset licensing documentation
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
