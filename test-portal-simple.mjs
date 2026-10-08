#!/usr/bin/env node

import { chromium } from 'playwright';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const errors = [];

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--window-size=1280,720']
  });
  
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('ERROR:', error.message);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });
  
  console.log('Loading title screen...');
  await page.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await wait(5000);
  
  await page.screenshot({ path: 'test-title.png' });
  console.log('Screenshot saved: test-title.png');
  
  const startButtonVisible = await page.evaluate(() => {
    const btn = document.querySelector('#start');
    return btn && !btn.disabled;
  });
  
  console.log('Start button enabled:', startButtonVisible);
  
  if (startButtonVisible) {
    console.log('Starting Chapter I...');
    await page.click('#start');
    await wait(3000);
    
    const skipBtn = await page.$('#skip-briefing');
    if (skipBtn) {
      console.log('Skipping briefing...');
      await skipBtn.click();
      await wait(2000);
    }
    
    console.log('Waiting 15 seconds in game...');
    await wait(15000);
    await page.screenshot({ path: 'test-chapter1.png' });
  }
  
  // Test Chapter II
  console.log('\nTesting Chapter II...');
  await page.goto('http://localhost:8888/', { waitUntil: 'domcontentloaded' });
  await wait(5000);
  
  console.log('Starting Chapter II...');
  await page.click('#start-ground');
  await wait(3000);
  
  const skipBtn2 = await page.$('#skip-briefing');
  if (skipBtn2) {
    console.log('Skipping briefing...');
    await skipBtn2.click();
    await wait(2000);
  }
  
  console.log('Waiting 15 seconds in game...');
  await wait(15000);
  await page.screenshot({ path: 'test-chapter2.png' });
  
  // Check HUD
  const hudState = await page.evaluate(() => {
    const missionHud = document.querySelector('#mission-hud');
    const hud = document.querySelector('#hud');
    return {
      missionHudHidden: missionHud ? missionHud.hidden : null,
      hudHidden: hud ? hud.hidden : null
    };
  });
  
  console.log('HUD state:', hudState);
  console.log('Total errors:', errors.length);
  
  await browser.close();
  process.exit(errors.length > 3 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
