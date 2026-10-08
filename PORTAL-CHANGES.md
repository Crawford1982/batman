# Portal Build Changes (4f90229a → 60402e4)

## Fixes Applied

### 1. District Names (Minimap & Code)
- ✅ Replaced `TRICORNER DOCKS` → `RIVERSIDE DOCKS`
- ✅ Replaced `THE NARROWS` / `The Narrows` → `THE FLATS` / `The Flats`
- ✅ Replaced `OLD GOTHAM` → `OLD QUARTER`
- ✅ Replaced `GOTHAM RIVER` → `CENTRAL RIVER`
- ✅ Updated minimap labels, district detection, and in-game text references

### 2. Dialogue Capitalization
- ✅ Fixed `Gordon` → `Chief Reeves` in prose (mid-sentence dialogue)
- ✅ Fixed smart quote issue (UTF-8 U+2019 → ASCII apostrophe)
- ✅ Kept `CHIEF REEVES:` / `HANDLER:` uppercase in speaker labels
- ✅ Updated arrival film: "Chief Reeves' people" instead of "Gordon's people"
- ✅ Updated briefing: "Chief Reeves is waiting" instead of "Gordon is waiting"

### 3. Chapter II Doubled HUD Fix
- ✅ Added `handover.cancel()` to `beginGround()` to clean state
- ✅ Added `$("mission-hud").hidden = true` check to hide air chapter HUD
- ✅ Air HUD elements (#hud, #mission-hud) now properly hidden when starting Chapter II from title screen

### 4. Nightblade Texture (⚠️ Manual Fix Required)
- ⚠️ Cannot auto-download Kenney Car Kit (website protection)
- ⚠️ Current nightblade.glb has hand-made 6.7KB colormap
- ⚠️ Real Kenney colormap is 12,371 bytes (makes car render properly in blue)

**Manual Fix Steps:**
1. Download: https://kenney.nl/assets/car-kit
2. Navigate to: `Car Kit/Models/GLB format/`
3. Run: `npx @gltf-transform/cli@4 copy race-future.glb nightblade.glb`
4. Copy output to `src/models/nightblade.glb`
5. Geometry is identical, only embedded texture changes

Or run: `./fix-nightblade.sh` (if Kenney download succeeds)

## Extended IP Grep Pattern

Added to verification: `tricorner|narrows|arkham|ace.chemicals|axis.chemicals|crime.alley|blackgate|old.gotham|gotham.river`

## Commits

- eea44ef: Fix minimap district names and dialogue capitalization
- 73f14f5: Fix remaining Gotham/Gordon/Narrows references in ground-level
- 7583839: Fix smart quote in Gordon replacement
- 60402e4: Add mission-hud hiding to beginGround() to prevent doubled HUD

## Testing Notes

- Playwright runtime test created (test-portal-runtime.mjs)
- Manual verification required for:
  - Chapter I: 15s playback, HUD elements check
  - Chapter II: 15s playback, verify no doubled HUD, check minimap labels
  - Nightblade car color (blue with proper Kenney texture)

## Known Limitations

1. Nightblade texture replacement requires manual Kenney download
2. Playwright test needs environment with proper WebGL support
3. Smart quotes in source files required UTF-8 aware replacement
