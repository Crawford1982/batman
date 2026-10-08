/**
 * Portal SDK Adapter
 * 
 * Provides hooks for game portal SDKs (GameDistribution, CrazyGames, itch.io, etc.)
 * Currently stubs - integrate actual SDK when deploying to a specific portal.
 */

export class PortalSDK {
  constructor() {
    this.sdkReady = false;
    this.initialized = false;
  }

  /**
   * Initialize the portal SDK
   * Call this before starting the game
   */
  async init() {
    if (this.initialized) return;
    
    // TODO: Detect and initialize specific portal SDK
    // Example for GameDistribution:
    // if (typeof window.gdsdk !== 'undefined') {
    //   await window.gdsdk.init();
    //   this.sdkReady = true;
    // }
    
    // Example for CrazyGames:
    // if (typeof window.CrazyGames !== 'undefined') {
    //   await window.CrazyGames.SDK.init();
    //   this.sdkReady = true;
    // }
    
    this.initialized = true;
    console.log('[Portal SDK] Initialized (stub mode)');
  }

  /**
   * Show pre-roll ad before game starts
   * @returns {Promise<void>}
   */
  async showPreroll() {
    if (!this.sdkReady) {
      console.log('[Portal SDK] No SDK loaded, skipping preroll');
      return;
    }

    // TODO: Implement portal-specific preroll
    // Example: await window.gdsdk.showAd('preroll');
    console.log('[Portal SDK] Preroll ad shown (stub)');
  }

  /**
   * Show midroll ad (e.g., between chapters or on game over)
   * @returns {Promise<void>}
   */
  async showMidroll() {
    if (!this.sdkReady) {
      console.log('[Portal SDK] No SDK loaded, skipping midroll');
      return;
    }

    // TODO: Implement portal-specific midroll
    // Example: await window.gdsdk.showAd('midroll');
    console.log('[Portal SDK] Midroll ad shown (stub)');
  }

  /**
   * Show rewarded ad (optional, for bonus content)
   * @returns {Promise<boolean>} true if reward should be granted
   */
  async showRewarded() {
    if (!this.sdkReady) {
      console.log('[Portal SDK] No SDK loaded, skipping rewarded ad');
      return false;
    }

    // TODO: Implement portal-specific rewarded ad
    console.log('[Portal SDK] Rewarded ad shown (stub)');
    return true;
  }

  /**
   * Notify portal that gameplay has started
   */
  gameplayStart() {
    if (!this.sdkReady) return;
    
    // TODO: Implement portal-specific gameplay start
    // Example: window.gdsdk.gameplayStart();
    console.log('[Portal SDK] Gameplay started');
  }

  /**
   * Notify portal that gameplay has stopped
   */
  gameplayStop() {
    if (!this.sdkReady) return;
    
    // TODO: Implement portal-specific gameplay stop
    // Example: window.gdsdk.gameplayStop();
    console.log('[Portal SDK] Gameplay stopped');
  }

  /**
   * Check if the game is in an iframe (portal embed)
   * @returns {boolean}
   */
  isEmbedded() {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  /**
   * Track game event (optional, for portal analytics)
   * @param {string} eventName
   * @param {object} data
   */
  trackEvent(eventName, data = {}) {
    if (!this.sdkReady) return;
    
    // TODO: Implement portal-specific event tracking
    console.log('[Portal SDK] Event tracked:', eventName, data);
  }
}

// Global singleton instance
export const portalSDK = new PortalSDK();
