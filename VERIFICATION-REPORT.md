# Portal Build Verification Report

**Branch:** `cursor/portal-ready-91ce` (PR #15)  
**HEAD SHA:** `baa5287fb75e22693d0aae040182a63cca15d587`  
**Date:** October 8, 2026

## Summary

Successfully restored shared source files to match `origin/main` exactly and moved all IP-free changes into the portal build pipeline (`scripts/build-portal.mjs`). All verification checks pass.

## Changes Made

### 1. Restored Shared Source to Main ✅

All `src/` files (except `src/models/`) now match `origin/main` exactly:

```bash
$ git diff origin/main...HEAD --stat -- src ':!src/models'
# (empty output - no changes)
```

The following files were restored to their original state:
- `src/cave-level.js`
- `src/cave-puzzles.js`
- `src/districts.js`
- `src/driving.js`
- `src/ground-level.js`
- `src/main.js`
- `src/minimap.js`
- `src/mission.js`
- `src/radio-lines.js`
- `src/rooftop-level.js`
- `src/rooftop-mission.js`
- `src/skyline.js`
- `src/street-detail.js`
- `src/style.css`
- `src/world.js`

### 2. Portal Build Pipeline Enhancements ✅

Updated `scripts/build-portal.mjs` to apply all necessary replacements during the portal build:

#### District and Place Renames
- `TRICORNER DOCKS` → `RIVERSIDE DOCKS`
- `TRICORNER SUBSTATION` → `RIVERSIDE SUBSTATION`
- `TRICORNER` → `RIVERSIDE` (standalone)
- `THE NARROWS` / `The Narrows` / `the Narrows` → `THE FLATS` / `The Flats` / `the Flats`
- `NARROWS` → `FLATS`
- `OLD GOTHAM` → `OLD QUARTER`
- `GOTHAM RIVER` → `CENTRAL RIVER`

#### Character Replacements
- Mid-sentence: `Batman` → `the operative`, `Alfred` → `Handler`, `Gordon` → `Chief Reeves`
- Speaker labels: `BATMAN /` → `THE OPERATIVE /`, `GORDON /` → `CHIEF REEVES /`, `ALFRED /` → `HANDLER /`
- General caps: `BATMAN` → `THE OPERATIVE`, `ALFRED` → `HANDLER`, `GORDON` → `CHIEF REEVES`

#### Chapter II HUD Fix (Portal Only)
Added defensive fix to `beginGround()` in portal-src/main.js:
```javascript
if (typeof handover !== "undefined") handover.cancel();
// ... existing code ...
if ($("mission-hud")) $("mission-hud").hidden = true;  // Hide air mission HUD
```

This prevents doubled HUD when starting Chapter II directly from the title screen. The fix is defensive (checks if `handover` exists) to avoid errors.

**Note:** The HUD bug also exists on `origin/main`, but per instructions, main was not modified.

### 3. Car Texture Fixed ✅

Replaced `src/models/nightblade.glb` with Kenney Car Kit's proper embedded colormap version:
- SHA256: `4b15f4e35ab284f9bdfd1678d00f91b697d657f53802de9aa179ce5cfe54ccc0`
- Contains real Kenney 12,371-byte colormap.png embedded
- Deleted helper scripts: `embed-texture.js`, `fix-nightblade.sh`

### 4. GLB Test Updated ✅

Modified `tests/glb-texture-check.test.js` to accept WebP embedded textures in addition to PNG and JPEG:
```javascript
const isWebP = imageData[0] === 0x52 && imageData[1] === 0x49 && 
               imageData[2] === 0x46 && imageData[3] === 0x46 &&
               imageData[8] === 0x57 && imageData[9] === 0x45 && 
               imageData[10] === 0x42 && imageData[11] === 0x50;
```

This allows `cave-kit` with its WebP texture to pass validation.

### 5. Repository Cleanup ✅

Removed agent report clutter:
- `FINAL-REPORT.txt`
- `IP-GREP-EXTENDED.md`
- `NIGHTBLADE-TEXTURE-FIX.md`
- `PORTAL-CHANGES.md`
- `SUMMARY.md`

Moved test scripts to proper location:
- `test-portal-comprehensive.mjs` → `scripts/test-portal-comprehensive.mjs`
- `test-portal-runtime.mjs` → `scripts/test-portal-runtime.mjs`

Kept:
- `PORTAL-QUICKSTART.md`
- `portal/submission/` (cover images, LISTING.md, CHECKLIST.md)

## Verification Results

### Build Tests

```bash
$ npm ci && npm test
# ✅ 71 tests passed, 0 failed

$ npm run build
# ✅ Main Batman site builds successfully (dist/)

$ npm run build:portal
# ✅ Portal build succeeds (dist-portal/, shadow-striker-portal.zip)
```

### Source File Integrity

```bash
$ git diff origin/main...HEAD --stat -- src ':!src/models'
# ✅ Empty output - no changes to shared source files
```

### IP Term Removal

```bash
$ rg -il 'batman|batmobile|bat-wing|batwing|warvet|visnik|predator|gotham|wayne|alfred|gordon|tricorner|narrows|arkham|ace chemicals|axis chemicals|crime alley|blackgate' dist-portal/
# ✅ No results - all IP terms removed

$ for glb in dist-portal/assets/*.glb; do strings "$glb" | rg -i 'batman|...|blackgate'; done
# ✅ No IP terms found in GLB files

$ ls dist-portal/assets/*.glb | xargs basename | rg -i 'batman|...|blackgate'
# ✅ No IP terms in GLB filenames
```

### GLB Files in Portal Build

- `cave-kit-x1-q2s6K.glb` - Quaternius (CC0)
- `crew-BGsGkQLg.glb` - Quaternius (CC0)
- `moves-BVqCZ9Cu.glb` - Quaternius (CC0)
- `nightblade-CMP7UUqI.glb` - Kenney Car Kit (CC0) ✅ **With proper colormap**
- `rooftop-kit-D9QVbd3l.glb` - Quaternius (CC0)
- `striker-interceptor-P6DzitQL.glb` - Kenney Space Kit (CC0)
- `surveillance-drone-DANjou3V.glb` - Kenney Space Kit (CC0)
- `theatre-kit-CXtLzlBP.glb` - Quaternius (CC0)
- `vigilante-Bt7lsPcD.glb` - Quaternius (CC0)

All models are CC0 (public domain) and cleared for commercial use.

## Files Changed vs Main

Total: **96 files** changed

**New/Modified Categories:**
- Portal build scripts: `scripts/build-portal.mjs`, `scripts/package-portal.mjs`, etc.
- Portal assets: `portal-public/`, `portal/` (voices, licenses, SDK, submission files)
- New CC0 models: `src/models/nightblade.glb`, `striker-interceptor.glb`, `surveillance-drone.glb`
- Portal config: `vite.config.portal.js`, `index.portal.html`
- Tests: `tests/glb-texture-check.test.js`

**No changes to:**
- Any `src/*.js` or `src/*.css` files outside of `src/models/`
- Any Batman game logic or content

## HUD Bug Status

**On main branch:** The Chapter II HUD bug **exists** on `origin/main`. Starting Chapter II directly from the title screen shows both the air chapter HUD and the driving HUD.

**On portal build:** The bug is **fixed** in the portal pipeline only. The fix is applied to `portal-src/main.js` during `scripts/build-portal.mjs` execution.

**Fix approach:** Defensive check for `handover` existence before calling `cancel()`, and explicit hiding of `#mission-hud` in `beginGround()`.

## Commits

1. **bef8c38** - Restore shared source to main, fix portal build pipeline
2. **a047d75** - Fix remaining IP references in portal build  
3. **baa5287** - Make Chapter II HUD fix defensive for portal

All commits pushed to `origin/cursor/portal-ready-91ce`.

## Conclusion

✅ All requirements met:
- Shared source restored to match `origin/main` exactly
- All IP-free changes moved into portal build pipeline
- Car texture replaced with proper Kenney version
- GLB test accepts WebP
- Repository cleaned up
- All builds pass
- No IP terms in portal build
- HUD bug fixed in portal (but still exists on main per instructions)

The branch is ready for review and testing.
