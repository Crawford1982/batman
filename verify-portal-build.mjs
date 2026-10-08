#!/usr/bin/env node

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const errors = [];
const consoleErrors = [];
const httpErrors = [];

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Start HTTP server
  console.log('Starting HTTP server for dist-portal...');
  const server = spawn('npx', ['http-server', 'dist-portal', '-p', '8888', '--cors'], {
    cwd: __dirname,
    stdio: 'pipe'
  });
  
  await wait(2000); // Give server time to start
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=swiftshader',
      '--window-size=1280,720'
    ]
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Set up error listeners
  page.on('pageerror', error => {
    errors.push({ type: 'pageerror', message: error.message, stack: error.stack });
    console.log('❌ Page error:', error.message);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('❌ Console error:', msg.text());
    }
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      httpErrors.push({ url: response.url(), status: response.status() });
      console.log(`❌ HTTP ${response.status()}: ${response.url()}`);
    }
  });
  
  try {
    // Test Chapter I
    console.log('\n=== Testing Chapter I (Air) ===');
    await page.goto('http://localhost:8888/');
    await wait(3000);
    
    console.log('Waiting for game to load...');
    await page.waitForSelector('#start:not([disabled])', { timeout: 30000 });
    await wait(1000);
    
    console.log('Title screen loaded, taking screenshot...');
    await page.screenshot({ path: 'title-screen.png' });
    
    // Start Chapter I
    console.log('Starting Chapter I (air)...');
    await page.click('#start');
    await wait(2000);
    
    // Skip briefing
    console.log('Skipping briefing...');
    await page.evaluate(() => {
      const skipBtn = document.querySelector('#skip-briefing');
      if (skipBtn) skipBtn.click();
    });
    await wait(2000);
    
    console.log('Flying for 15 seconds...');
    await wait(15000);
    
    console.log('Taking Chapter I screenshot...');
    await page.screenshot({ path: 'chapter-1-air.png' });
    
    // Test Chapter II
    console.log('\n=== Testing Chapter II (Ground/Driving) ===');
    await page.goto('http://localhost:8888/', { waitUntil: 'load' });
    await wait(2000);
    
    // Start Chapter II
    console.log('Starting Chapter II...');
    await page.click('#start-ground');
    await wait(2000);
    
    // Skip briefing
    console.log('Skipping briefing...');
    await page.evaluate(() => {
      const skipBtn = document.querySelector('#skip-briefing');
      if (skipBtn) skipBtn.click();
    });
    await wait(2000);
    
    console.log('Driving for 15 seconds...');
    await wait(15000);
    
    console.log('Taking Chapter II screenshot...');
    await page.screenshot({ path: 'chapter-2-ground.png' });
    
    // Check for visual issues
    console.log('\n=== Checking for visual issues ===');
    
    // Check for doubled HUD
    const hudElements = await page.evaluate(() => {
      const missionHud = document.querySelector('#mission-hud');
      const hud = document.querySelector('#hud');
      return {
        missionHudVisible: missionHud && !missionHud.hidden,
        hudVisible: hud && !hud.hidden,
        missionHudDisplay: missionHud ? getComputedStyle(missionHud).display : 'none',
        hudDisplay: hud ? getComputedStyle(hud).display : 'none'
      };
    });
    
    console.log('HUD state:', JSON.stringify(hudElements, null, 2));
    
    if (hudElements.missionHudVisible && hudElements.missionHudDisplay !== 'none') {
      console.log('⚠️  WARNING: #mission-hud is visible during Chapter II (possible doubled HUD)');
    } else {
      console.log('✅ No doubled HUD detected');
    }
    
    // Check minimap canvas content (looking for IP terms)
    const canvasText = await page.evaluate(() => {
      const canvas = document.querySelector('#minimap');
      if (!canvas) return 'No minimap found';
      const ctx = canvas.getContext('2d');
      // We can't directly read text from canvas, but we can check if the canvas exists
      return 'Minimap canvas exists';
    });
    console.log('Minimap:', canvasText);
    
  } catch (err) {
    console.error('Test error:', err);
    errors.push({ type: 'test-error', message: err.message, stack: err.stack });
  }
  
  await browser.close();
  server.kill();
  
  // Write results
  console.log('\n=== Test Results ===');
  console.log(`Page errors: ${errors.length}`);
  console.log(`Console errors: ${consoleErrors.length}`);
  console.log(`HTTP errors (>= 400): ${httpErrors.length}`);
  
  const results = {
    errors,
    consoleErrors,
    httpErrors,
    timestamp: new Date().toISOString()
  };
  
  writeFileSync('verification-results.json', JSON.stringify(results, null, 2));
  console.log('\nResults written to verification-results.json');
  console.log('Screenshots saved: title-screen.png, chapter-1-air.png, chapter-2-ground.png');
  
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
