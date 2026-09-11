import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'msedge',headless:true});
try{
 const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const session=await p.context().newCDPSession(p);
 await session.send('Network.enable');
 await session.send('Network.emulateNetworkConditions',{offline:false,latency:30,downloadThroughput:700000,uploadThroughput:700000});
 await p.goto('http://localhost:4173/?test=1',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>/MB/.test(document.getElementById('loading').textContent),null,{timeout:30000});
 assert.ok(await p.locator('#loading').isVisible());
 await p.waitForFunction(()=>window.__batwing?.ready,null,{timeout:60000});
 assert.ok(await p.locator('#loading').isHidden());assert.deepEqual(errors,[]);
 console.log('PASS throttled download progress and completion cleanup; no browser errors');
}finally{await b.close();}
