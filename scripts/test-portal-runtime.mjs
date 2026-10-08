import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist-portal');

const server = createServer(async (req, res) => {
  let filePath = join(distDir, req.url === '/' ? 'index.portal.html' : req.url);
  
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  
  const ext = filePath.split('.').pop();
  const mimeTypes = {
    html: 'text/html',
    js: 'application/javascript',
    css: 'text/css',
    png: 'image/png',
    glb: 'model/gltf-binary',
    webp: 'image/webp',
    hdr: 'application/octet-stream'
  };
  
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(content);
  } catch (err) {
    res.writeHead(500);
    res.end('Error');
  }
});

await new Promise(resolve => server.listen(3456, resolve));
console.log('Server running on http://localhost:3456');

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--disable-gpu']
});

const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

const errors = [];
const logs = [];

page.on('console', msg => {
  logs.push(`[${msg.type()}] ${msg.text()}`);
  if (msg.type() === 'error') errors.push(msg.text());
});

page.on('pageerror', err => {
  errors.push(`Page error: ${err.message}`);
});

page.on('requestfailed', req => {
  errors.push(`Request failed: ${req.url()} - ${req.failure().errorText}`);
});

await page.goto('http://localhost:3456');
await page.waitForLoadState('networkidle');

// Test Chapter I
console.log('\n=== Testing Chapter I ===');
await page.click('#start-air');
await page.waitForSelector('#briefing', { state: 'visible', timeout: 5000 });
await page.click('#skip-briefing');
await page.waitForTimeout(15000); // Play for 15 seconds
await page.screenshot({ path: 'chapter-i-15s.png' });

// Check HUD elements
const airHudCount = await page.evaluate(() => {
  const titleEls = document.querySelectorAll('[id*="hud"] h1, [id*="mission"] h1');
  const timerEls = document.querySelectorAll('[id*="time"]:not([hidden])');
  return { titles: titleEls.length, timers: timerEls.length };
});
console.log(`Chapter I HUD elements: ${JSON.stringify(airHudCount)}`);

// Return to menu
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
await page.click('#exit');
await page.waitForSelector('#menu', { state: 'visible', timeout: 5000 });

// Test Chapter II
console.log('\n=== Testing Chapter II ===');
await page.click('#start-ground');
await page.waitForTimeout(2000);

// Wait for drive-launch button to be enabled
await page.waitForSelector('#drive-launch:not([disabled])', { timeout: 30000 });
await page.click('#drive-launch');
await page.waitForTimeout(15000); // Play for 15 seconds
await page.screenshot({ path: 'chapter-ii-15s.png' });

// Check for doubled HUD
const groundHudCheck = await page.evaluate(() => {
  const airHud = document.querySelector('#hud');
  const missionHud = document.querySelector('#mission-hud');
  const driveHud = document.querySelector('#drive-hud');
  
  return {
    airHudVisible: airHud && !airHud.hidden && getComputedStyle(airHud).display !== 'none',
    missionHudVisible: missionHud && !missionHud.hidden && getComputedStyle(missionHud).display !== 'none',
    driveHudVisible: driveHud && !driveHud.hidden && getComputedStyle(driveHud).display !== 'none',
  };
});

console.log(`Chapter II HUD state: ${JSON.stringify(groundHudCheck)}`);

if (groundHudCheck.airHudVisible || groundHudCheck.missionHudVisible) {
  errors.push('DOUBLED HUD BUG: Air chapter HUD elements are visible in Chapter II');
}

console.log(`\n=== Test Results ===`);
console.log(`Total console messages: ${logs.length}`);
console.log(`Errors: ${errors.length}`);
if (errors.length > 0) {
  console.log('\nErrors found:');
  errors.forEach(err => console.log(`  - ${err}`));
}

console.log('\nFirst 20 console logs:');
logs.slice(0, 20).forEach(log => console.log(`  ${log}`));

await browser.close();
server.close();

process.exit(errors.length > 0 ? 1 : 0);
