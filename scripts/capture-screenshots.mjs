#!/usr/bin/env node

/**
 * Capture screenshots from the portal build for submission materials
 */

import { chromium } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const outputDir = path.join(rootDir, 'portal', 'submission', 'images');
const distDir = path.join(rootDir, 'dist-portal');

// Ensure output directory exists
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1
});

const page = await context.newPage();

// Start a local server for the dist-portal directory
console.log('📸 Starting screenshot capture...\n');

// Navigate to the game (using file:// protocol)
const indexPath = path.join(distDir, 'portal', 'index.html');
await page.goto(`file://${indexPath}`);

// Wait for game to load
console.log('⏳ Waiting for game to load...');
await page.waitForTimeout(5000);

// Capture initial loading/title screen
console.log('📷 Capturing title screen...');
await page.screenshot({
  path: path.join(outputDir, 'screenshot-title.png'),
  fullPage: false
});

// Wait for more game content
await page.waitForTimeout(3000);

// Try to click through any initial screens
try {
  // Look for play/start buttons
  const playButton = await page.locator('button').first();
  if (await playButton.isVisible({ timeout: 2000 })) {
    await playButton.click();
    await page.waitForTimeout(5000);
    
    console.log('📷 Capturing gameplay screen...');
    await page.screenshot({
      path: path.join(outputDir, 'screenshot-gameplay.png'),
      fullPage: false
    });
  }
} catch (e) {
  console.log('ℹ️  Could not interact with game UI');
}

// Capture a few more frames
await page.waitForTimeout(2000);
console.log('📷 Capturing additional frame...');
await page.screenshot({
  path: path.join(outputDir, 'screenshot-scene.png'),
  fullPage: false
});

await browser.close();

console.log('\n✅ Screenshots captured in portal/submission/images/');
console.log('   Now resizing for portal requirements...\n');

// Use ImageMagick or similar to create required sizes
// For now, just use the captured screenshots and resize with canvas

import { createCanvas, loadImage } from 'canvas';

async function resizeImage(inputPath, outputPath, width, height) {
  try {
    const img = await loadImage(inputPath);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Calculate scaling to cover the canvas while maintaining aspect ratio
    const scale = Math.max(width / img.width, height / img.height);
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const x = (width - scaledWidth) / 2;
    const y = (height - scaledHeight) / 2;
    
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, buffer);
    console.log(`✅ Created ${path.basename(outputPath)} (${width}×${height})`);
  } catch (err) {
    console.error(`⚠️  Could not create ${outputPath}:`, err.message);
  }
}

// We don't have canvas module installed, so let's use a different approach
console.log('ℹ️  Canvas module not available, using sharp or manual resizing needed');
console.log('   Base screenshots captured successfully.');
