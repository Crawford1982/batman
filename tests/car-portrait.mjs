import { chromium } from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
const p=await browser.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:4173/?test=1');await p.waitForFunction(()=>window.__batwing?.ready);await p.click('#start-ground');await p.waitForFunction(()=>window.__batwing.state.groundReady);
await p.evaluate(()=>{const g=window.__batwing.ground;g.time=0;g.update(0);g.phase='paused';document.querySelector('#drive-load').hidden=true;});
await p.screenshot({path:`verification/car-${process.argv[2]||'after'}.png`});await browser.close();
