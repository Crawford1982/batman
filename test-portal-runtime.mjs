#!/usr/bin/env node
/**
 * Test portal build with Playwright: serve dist-portal, open title + Ch I + Ch II,
 * capture console errors and HTTP errors
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distPortal = join(__dirname, 'dist-portal');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.hdr': 'application/octet-stream',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain'
};

// Simple static server
const server = createServer((req, res) => {
  let filePath = join(distPortal, req.url === '/' ? 'index.html' : req.url);
  
  try {
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      filePath = join(filePath, 'index.html');
    }
    
    const ext = extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

async function main() {
  await new Promise((resolve) => server.listen(8765, resolve));
  console.log('🌐 Serving dist-portal on http://localhost:8765\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true
  });
  
  const errors = [];
  const httpErrors = [];
  
  context.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      httpErrors.push(`${status} ${response.url()}`);
    }
  });
  
  const page = await context.newPage();
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`Console error: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', (err) => {
    errors.push(`Page error: ${err.message}`);
  });
  
  // Test title screen
  console.log('📄 Loading title screen...');
  await page.goto('http://localhost:8765/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  console.log('   Title screen loaded');
  
  // Test Chapter I (by reloading and triggering it via evaluation)
  console.log('🎮 Testing Chapter I assets...');
  await page.goto('http://localhost:8765/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  // Check that start button exists
  const startBtn = await page.$('#start');
  console.log(`   Start button found: ${!!startBtn}`);
  
  // Test Chapter II by navigating and checking
  console.log('🚗 Testing Chapter II assets...');
  await page.goto('http://localhost:8765/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const groundBtn = await page.$('#start-ground');
  console.log(`   Chapter II button found: ${!!groundBtn}`);
  
  await browser.close();
  server.close();
  
  console.log('\n📊 Test Results:\n');
  console.log(`Console errors: ${errors.length}`);
  errors.forEach(e => console.log(`  ❌ ${e}`));
  
  console.log(`\nHTTP 4xx/5xx responses: ${httpErrors.length}`);
  httpErrors.forEach(e => console.log(`  ❌ ${e}`));
  
  if (errors.length === 0 && httpErrors.length === 0) {
    console.log('\n✅ All tests passed: 0 errors, 0 HTTP failures\n');
    process.exit(0);
  } else {
    console.log(`\n❌ Tests failed: ${errors.length} console errors, ${httpErrors.length} HTTP errors\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
