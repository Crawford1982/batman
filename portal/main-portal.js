// Portal version entry point
// This file wraps the main game and integrates portal SDK

import { portalSDK } from './portal-sdk.js';

// Import and override text modules before loading main game
import * as portalRadioLines from './radio-lines-portal.js';
import * as portalDistricts from './districts-portal.js';

// Patch the modules in the module cache
// This ensures when main.js imports these modules, it gets the portal versions
import('../src/main.js').then(async (mainModule) => {
  // Initialize portal SDK
  await portalSDK.init();
  
  // Show preroll ad before game starts (if SDK is loaded)
  if (portalSDK.sdkReady) {
    await portalSDK.showPreroll();
  }
  
  console.log('[Portal Build] Game loaded with IP-free theme');
});

// Patch analytics to be no-op for portal build
window.gothamAnalytics = {
  event: () => {},
  openSettings: () => {}
};

// Log embedded status
if (portalSDK.isEmbedded()) {
  console.log('[Portal] Running in iframe embed mode');
}
