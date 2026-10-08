#!/usr/bin/env node

/**
 * Package Portal Build
 * 
 * Creates a ZIP file of the portal build ready for submission to game portals.
 * Also generates thumbnail images and calculates bundle sizes.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const distPortalDir = path.join(rootDir, 'dist-portal');
const outputZip = path.join(rootDir, 'shadow-striker-portal.zip');

async function getDirectorySize(dir) {
  let size = 0;
  const files = await fs.readdir(dir, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      size += await getDirectorySize(filePath);
    } else {
      const stats = await fs.stat(filePath);
      size += stats.size;
    }
  }
  
  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function createZip() {
  console.log('📦 Creating ZIP archive...');
  
  // Remove existing ZIP if present
  try {
    await fs.unlink(outputZip);
  } catch (e) {
    // File doesn't exist, that's OK
  }
  
  // Use system zip command
  try {
    // Change to dist-portal directory and zip contents
    execSync(`cd "${distPortalDir}" && zip -r "../shadow-striker-portal.zip" . -q`, {
      stdio: 'inherit'
    });
    
    // Get size of created ZIP
    const stats = await fs.stat(outputZip);
    return stats.size;
  } catch (err) {
    throw new Error(`Failed to create ZIP: ${err.message}`);
  }
}

async function generateBuildInfo() {
  const info = {
    buildDate: new Date().toISOString(),
    game: 'Shadow Striker: Steel City',
    version: '1.0.0-portal',
    theme: 'IP-free version for game portal submission',
    warnings: [
      'NonCommercial assets need replacement - see portal/ASSET-LICENSING.md',
      'Vehicle model (Nightblade): CC BY-NC-SA 3.0 - REPLACE BEFORE COMMERCIAL USE',
      'Drone model: CC BY-NC-SA 4.0 - REPLACE BEFORE COMMERCIAL USE'
    ]
  };
  
  await fs.writeFile(
    path.join(distPortalDir, 'BUILD-INFO.json'),
    JSON.stringify(info, null, 2)
  );
}

async function analyzeBuild() {
  console.log('\n📊 Build Analysis:');
  console.log('═══════════════════════════════════════════════════\n');
  
  try {
    const distSize = await getDirectorySize(distPortalDir);
    console.log(`📁 Total build size: ${formatBytes(distSize)}`);
    
    // Check for key asset files
    const assets = await fs.readdir(path.join(distPortalDir, 'assets'));
    const jsFiles = assets.filter(f => f.endsWith('.js'));
    const cssFiles = assets.filter(f => f.endsWith('.css'));
    
    console.log(`📄 JavaScript bundles: ${jsFiles.length}`);
    console.log(`🎨 CSS files: ${cssFiles.length}`);
    
    // Analyze model files
    try {
      const models = [
        'shadow-striker.glb',
        'nightblade.glb',
        'predator.glb',
        'vigilante.glb',
        'crew.glb',
        'moves.glb',
        'cave-kit.glb',
        'rooftop-kit.glb',
        'theatre-kit.glb'
      ];
      
      console.log('\n🎮 Model Files:');
      for (const model of models) {
        try {
          const modelPath = path.join(distPortalDir, model);
          const stats = await fs.stat(modelPath);
          console.log(`  • ${model}: ${formatBytes(stats.size)}`);
        } catch (e) {
          // Model might not exist in dist, that's OK
        }
      }
    } catch (e) {
      console.log('  (Model analysis skipped - files in subdirs)');
    }
    
  } catch (err) {
    console.error('⚠️  Could not analyze build:', err.message);
  }
}

async function main() {
  console.log('📦 Packaging Portal Build...\n');
  
  // Check dist-portal exists
  try {
    await fs.access(distPortalDir);
  } catch (e) {
    console.error('❌ dist-portal directory not found!');
    console.error('   Run: npm run build:portal:vite first\n');
    process.exit(1);
  }
  
  // Generate build info
  await generateBuildInfo();
  
  // Analyze build
  await analyzeBuild();
  
  // Create ZIP
  const zipSize = await createZip();
  
  console.log('\n✅ Portal build packaged successfully!');
  console.log(`📦 Output: ${path.basename(outputZip)}`);
  console.log(`📊 ZIP size: ${formatBytes(zipSize)}\n`);
  
  console.log('📋 Portal Submission Checklist:');
  console.log('  [ ] Test in iframe embed');
  console.log('  [ ] Test on mobile devices');
  console.log('  [ ] Integrate portal-specific SDK (if required)');
  console.log('  [ ] Generate gameplay screenshots (512x512, 1280x720)');
  console.log('  [ ] Write portal-specific game description');
  console.log('  [ ] Set up monetization preferences\n');
}

main().catch(err => {
  console.error('❌ Packaging failed:', err);
  process.exit(1);
});
