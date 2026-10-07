# Portal Build - IP-Free Version

This directory contains the configuration and scripts for building an IP-free version of the game suitable for submission to HTML5 game portals (GameDistribution, CrazyGames, itch.io, etc.).

## Quick Start

```bash
# Build the portal version (all-in-one command)
npm run build:portal

# Or run steps individually:
npm run build:portal:prepare   # Copy src/ to portal-src/ with text replacements
npm run build:portal:vite      # Build with Vite
npm run build:portal:package   # Create ZIP file

# For development
npm run dev:portal             # Start dev server for portal version
```

## Output

- **dist-portal/**: Built game files ready for portal submission
- **shadow-striker-portal.zip**: Compressed archive for upload (12.7 MB)
- **portal-src/**: Source files with IP-free text (generated, not committed)

## Theme Changes

### Original → Portal Version

| Original | Portal Version |
|----------|---------------|
| **Title** | |
| Batwing: Gotham After Dark | Shadow Striker: Steel City |
| **Vehicles** | |
| Batwing | Shadow Striker (aircraft) |
| Batmobile | Nightblade (vehicle) |
| Batcave | Headquarters |
| Batcomputer | Command Terminal |
| **Location** | |
| Gotham City | Steel City |
| Old Gotham | Old Quarter |
| Tricorner Docks | Riverside Docks |
| Gotham River | Central River |
| **Organization** | |
| Wayne Aerospace | Vanguard Systems |
| **Characters** | |
| Batman | THE OPERATIVE |
| Alfred | HANDLER |
| Gordon | CHIEF REEVES |

## Critical Asset Issues ⚠️

### NonCommercial (NC) Licensed Assets

**IMPORTANT**: The following assets CANNOT be used in commercial contexts (including ad-supported portals):

1. **Vehicle Model** (`batmobile.glb` → `nightblade.glb`)
   - License: CC BY-NC-SA 3.0
   - Source: visnik's "89 Batmobile"
   - **Action Required**: Replace before portal submission

2. **Drone Model** (`predator.glb`)
   - License: CC BY-NC-SA 4.0
   - Source: VTX's "General Atomics MQ-1 Predator UAV"
   - **Action Required**: Replace before portal submission

### Recommended Replacements

#### For the Vehicle:
- Search on [Poly Haven](https://polyhaven.com) for CC0 vehicles
- Use [Quaternius](https://quaternius.com) vehicle packs (CC0)
- Use [Kenney Assets](https://kenney.nl) (CC0)
- Commission an original model
- Create a simple procedural vehicle

#### For the Drone:
- Use procedural geometry (simple shapes)
- Find CC0 drone models on Poly Haven or Quaternius
- Create original low-poly enemy aircraft
- Commission original models

### Commercial-OK Assets ✓

The following assets are safe for commercial/ad-supported use:

- **Aircraft** (batwing.glb): CC BY 4.0 (commercial OK)
- **Characters**: Quaternius - CC0 (public domain)
- **Environment**: Poly Haven, Quaternius - CC0 (public domain)
- **Props & Textures**: Poly Haven - CC0 (public domain)

**Note**: Verify the aircraft model doesn't contain trademarked Batman imagery in its textures.

## Portal SDK Integration

The build includes stub hooks for portal SDKs in `portal/portal-sdk.js`. When deploying to a specific portal:

1. Add the portal's SDK script tag to `portal/index.html`
2. Implement the actual SDK calls in `portal/portal-sdk.js`
3. Test preroll/midroll ad integration

Example SDKs to integrate:
- **GameDistribution**: `window.gdsdk`
- **CrazyGames**: `window.CrazyGames.SDK`
- **itch.io**: Usually just iframe embed, no special SDK

## Technical Features

✓ Self-contained build (no external dependencies except Three.js CDN fallback)  
✓ Works in iframe embed  
✓ Mobile/touch controls included  
✓ No external analytics (analytics.js removed)  
✓ Relative paths (works from any subdirectory)  
✓ Fast loading (~13 MB total, 447 KB JS gzipped)  

## File Structure

```
portal/
├── index.html              # Portal-specific HTML (IP-free)
├── portal-sdk.js           # Portal SDK adapter (stubs)
├── theme-config.js         # Theme configuration
├── ASSET-LICENSING.md      # Detailed asset licensing info
└── README.md              # This file

vite.config.portal.js       # Vite build configuration
scripts/
├── build-portal.mjs        # Text replacement script
└── package-portal.mjs      # ZIP packaging script
```

## Testing Checklist

Before submitting to a portal:

- [ ] Replace NC-licensed vehicle and drone models
- [ ] Test in iframe: `<iframe src="dist-portal/index.html">`
- [ ] Test on mobile device (touch controls)
- [ ] Verify all Batman/DC references are removed from UI
- [ ] Check browser console for errors
- [ ] Verify game completes all three chapters
- [ ] Test with portal SDK integrated
- [ ] Create gameplay screenshots (512x512, 1280x720)
- [ ] Write portal-specific description

## Portal Submission Requirements

### GameDistribution
- Max file size: Usually 100-200 MB (we're 13 MB ✓)
- SDK integration required
- HTTPS required
- Monetization: Display ads

### CrazyGames
- Max file size: 500 MB (we're 13 MB ✓)
- SDK integration required
- Monetization: Display & rewarded ads
- QA approval process

### itch.io
- No strict file size limit
- iframe embed
- Monetization: Optional donations/sales
- No SDK required

## Known Issues

1. JS files still contain internal Batman/Gotham references in variable names and comments
   - **Impact**: None - users don't see internal code
   - **Fix needed**: No - only UI text matters

2. Model filenames still reference original theme (batwing.glb, batmobile.glb)
   - **Impact**: None - filenames aren't visible to users
   - **Fix needed**: Optional - can rename if desired

3. No minification currently applied
   - **Impact**: Larger JS bundle size (2 MB vs ~800 KB minified)
   - **Fix needed**: Add terser/esbuild to package.json if size is critical

## Maintenance

To update the portal build after code changes:

```bash
# Make changes to src/
npm run build:portal  # Rebuild portal version
```

The build script will automatically:
1. Copy src/ to portal-src/
2. Replace IP references in HTML/CSS
3. Build with Vite
4. Package into ZIP

## Support

See the main README.md for development instructions.

For portal-specific issues, check:
- portal/ASSET-LICENSING.md - Detailed asset licensing
- scripts/build-portal.mjs - Text replacement logic
- vite.config.portal.js - Build configuration
