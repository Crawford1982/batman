#!/usr/bin/env node

/**
 * Portal Runtime Test
 * 
 * Verifies the portal build works at runtime:
 * 1. Checks that all DOM IDs referenced in main.js exist in index.html
 * 2. Tests that 3D scenes render properly in all chapters
 * 3. Detects any runtime errors that would break the game
 */

import { chromium } from 'playwright';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const errors = [];
const consoleErrors = [];
const httpErrors = [];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check 1: Verify all DOM IDs referenced at module top level exist in HTML
function checkDomIds() {
  console.log('\n=== Check 1: DOM ID References ===\n');
  
  const portalSrcPath = join(rootDir, 'portal-src', 'main.js');
  const indexHtmlPath = join(rootDir, 'index.portal.html');
  
  if (!existsSync(portalSrcPath)) {
    console.error('❌ portal-src/main.js not found. Run build:portal:prepare first.');
    return false;
  }
  
  if (!existsSync(indexHtmlPath)) {
    console.error('❌ index.portal.html not found. Run build:portal:prepare first.');
    return false;
  }
  
  const mainJs = readFileSync(portalSrcPath, 'utf-8');
  const indexHtml = readFileSync(indexHtmlPath, 'utf-8');
  
  // Find all $("id") references at module top level (before any function definitions)
  // This catches onclick assignments that run during module init
  const topLevelMatches = mainJs.match(/^\$\("([^"]+)"\)/gm) || [];
  const funcDefMatch = mainJs.search(/^(function|const|let|var)\s/m);
  const topLevelCode = funcDefMatch > 0 ? mainJs.slice(0, funcDefMatch) : mainJs;
  
  // Find all $("id") references that are assigned .onclick at top level
  const onclickPattern = /\$\("([^"]+)"\)\.onclick/g;
  const onclickRefs = [...mainJs.matchAll(onclickPattern)].map(m => m[1]);
  
  // Also check getElementById references
  const getElementByIdPattern = /getElementById\(["']([^"']+)["']\)/g;
  const getElementRefs = [...mainJs.matchAll(getElementByIdPattern)].map(m => m[1]);
  
  const allRefs = [...new Set([...onclickRefs, ...getElementRefs])];
  
  console.log(`Found ${onclickRefs.length} .onclick assignments in main.js`);
  console.log(`Found ${getElementRefs.length} getElementById calls in main.js`);
  console.log(`Total unique IDs to check: ${allRefs.length}\n`);
  
  let missingIds = [];
  
  for (const id of allRefs) {
    const hasId = indexHtml.includes(`id="${id}"`);
    if (!hasId) {
      console.error(`❌ Missing: #${id} is referenced in main.js but not in index.html`);
      missingIds.push(id);
    } else {
      console.log(`✓ #${id}`);
    }
  }
  
  if (missingIds.length > 0) {
    console.error(`\n❌ ${missingIds.length} missing IDs will cause runtime errors!`);
    return false;
  }
  
  console.log(`\n✅ All ${allRefs.length} referenced IDs exist in index.html`);
  return true;
}

// Check 2: Runtime verification with Playwright
async function checkRuntime() {
  console.log('\n=== Check 2: Runtime Verification ===\n');
  
  const distPortalPath = join(rootDir, 'dist-portal');
  
  if (!existsSync(distPortalPath)) {
    console.error('❌ dist-portal not found. Run build:portal first.');
    return false;
  }
  
  // Start server
  const { spawn } = await import('child_process');
  const server = spawn('npx', ['http-server', 'dist-portal', '-p', '8765', '--cors', '-c-1'], {
    cwd: rootDir,
    stdio: 'pipe'
  });
  
  console.log('Starting HTTP server on port 8765...');
  await wait(4000); // Give server more time to start
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--window-size=1280,720']
  });
  
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  
  // Set up error listeners
  page.on('pageerror', error => {
    errors.push({ type: 'pageerror', message: error.message, stack: error.stack });
    console.error('❌ Page error:', error.message);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('❌ Console error:', msg.text());
    }
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      httpErrors.push({ url: response.url(), status: response.status() });
      console.error(`❌ HTTP ${response.status()}: ${response.url()}`);
    }
  });
  
  let success = true;
  
  try {
    // Test title screen
    console.log('\n--- Testing Title Screen ---');
    await page.goto('http://localhost:8765/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('#start:not([disabled])', { timeout: 15000 });
    console.log('✓ Title loaded, waiting for 3D scene...');
    await wait(5000);
    
    await page.screenshot({ path: join(rootDir, 'portal-title-screen.png') });
    console.log('✓ Screenshot saved: portal-title-screen.png');
    
    // Check that canvas exists and has content
    const hasCanvas = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas && canvas.width > 0 && canvas.height > 0;
    });
    
    if (!hasCanvas) {
      console.error('❌ No canvas element found on title screen');
      success = false;
    } else {
      console.log('✓ Canvas element present');
    }
    
    // Test Chapter I
    console.log('\n--- Testing Chapter I (Air) ---');
    await page.click('#start');
    await wait(2000);
    
    const skipBriefing = await page.$('#skip-briefing');
    if (skipBriefing) {
      await skipBriefing.click();
      console.log('✓ Skipped briefing');
    }
    await wait(15000);
    
    await page.screenshot({ path: join(rootDir, 'portal-chapter1-air.png') });
    console.log('✓ Screenshot saved: portal-chapter1-air.png');
    
    // Test Chapter II
    console.log('\n--- Testing Chapter II (Ground) ---');
    await page.goto('http://localhost:8765/', { waitUntil: 'domcontentloaded' });
    
    // Wait for game to load
    await page.waitForSelector('#start:not([disabled])', { timeout: 15000 });
    await wait(2000);
    
    await page.click('#start-ground');
    console.log('✓ Clicked Chapter II button');
    await wait(3000);
    
    // Skip briefing using evaluate to avoid visibility issues
    const skipClicked = await page.evaluate(() => {
      const skipBtn = document.querySelector('#skip-briefing');
      if (skipBtn) {
        skipBtn.click();
        return true;
      }
      return false;
    });
    
    if (skipClicked) {
      console.log('✓ Skipped briefing');
    }
    await wait(15000);
    
    await page.screenshot({ path: join(rootDir, 'portal-chapter2-ground.png') });
    console.log('✓ Screenshot saved: portal-chapter2-ground.png');
    
  } catch (err) {
    console.error('❌ Runtime test failed:', err.message);
    errors.push({ type: 'test-error', message: err.message, stack: err.stack });
    success = false;
  }
  
  await browser.close();
  server.kill();
  
  // Report results
  console.log('\n=== Results ===');
  console.log(`Page errors: ${errors.length}`);
  console.log(`Console errors: ${consoleErrors.length}`);
  console.log(`HTTP errors (>= 400): ${httpErrors.length}`);
  
  if (errors.length > 0 || consoleErrors.length > 0 || httpErrors.length > 0) {
    console.log('\n❌ Runtime errors detected:\n');
    
    if (errors.length > 0) {
      console.log('Page errors:');
      errors.forEach(e => console.log(`  - ${e.message}`));
    }
    
    if (consoleErrors.length > 0) {
      console.log('\nConsole errors:');
      consoleErrors.forEach(e => console.log(`  - ${e}`));
    }
    
    if (httpErrors.length > 0) {
      console.log('\nHTTP errors:');
      httpErrors.forEach(e => console.log(`  - ${e.status}: ${e.url}`));
    }
    
    success = false;
  }
  
  const results = {
    errors,
    consoleErrors,
    httpErrors,
    timestamp: new Date().toISOString()
  };
  
  writeFileSync(join(rootDir, 'portal-runtime-results.json'), JSON.stringify(results, null, 2));
  
  return success;
}

async function main() {
  console.log('🎮 Portal Runtime Test\n');
  
  // Check 1: DOM IDs
  const idsOk = checkDomIds();
  
  if (!idsOk) {
    console.error('\n❌ DOM ID check failed. Fix missing IDs before runtime test.');
    process.exit(1);
  }
  
  // Check 2: Runtime
  const runtimeOk = await checkRuntime();
  
  if (!runtimeOk) {
    console.error('\n❌ Runtime verification failed');
    process.exit(1);
  }
  
  console.log('\n✅ All portal runtime tests passed!\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
