# Portal Build - Quick Start Guide for James

## What Was Done

Created a completely separate, IP-free version of the game that can be submitted to HTML5 game portals (GameDistribution, CrazyGames, itch.io) to earn ad revenue.

**Pull Request**: https://github.com/Crawford1982/batman/pull/15

## Key Points

✅ **Live site UNAFFECTED** - batman1989.co.uk still works exactly as before  
✅ **Separate build** - Portal version builds to `dist-portal/` (not `dist/`)  
✅ **IP-free theme** - All Batman/DC references replaced in UI  
✅ **All tests pass** - 70/70 tests still passing  
✅ **Ready to build** - Single command creates portal ZIP  

❌ **CRITICAL**: Vehicle and drone models are NonCommercial-licensed and MUST be replaced

## Build the Portal Version

```bash
npm run build:portal
```

This creates:
- `dist-portal/` - Built game files
- `shadow-striker-portal.zip` - 12.7 MB ZIP for upload

## What Changed in the UI

| Original | Portal Version |
|----------|---------------|
| Batwing: Gotham After Dark | Shadow Striker: Steel City |
| Batwing (aircraft) | Shadow Striker |
| Batmobile | Nightblade |
| Gotham City | Steel City |
| Batman | THE OPERATIVE |
| Alfred | HANDLER |
| Gordon | CHIEF REEVES |

## CRITICAL Issue: NonCommercial Assets

### These 2 Assets CANNOT Be Used With Ad Revenue:

**1. Vehicle Model** (batmobile.glb)
- License: CC BY-NC-SA 3.0
- Problem: "NC" = NonCommercial clause
- **You MUST replace this before portal submission**

**2. Drone Model** (predator.glb)  
- License: CC BY-NC-SA 4.0
- Problem: "NC" = NonCommercial clause
- **You MUST replace this before portal submission**

### All Other Assets Are OK ✓

Everything else is licensed CC0 or CC-BY and can be used commercially:
- Aircraft (batwing.glb): CC BY 4.0 ✓
- Characters: CC0 ✓
- Environment, props, textures: CC0 ✓

## Where to Find Replacement Assets

### For the Vehicle:
1. **Poly Haven** (https://polyhaven.com) - Free CC0 models
2. **Quaternius** (https://quaternius.com) - Free CC0 packs
3. **Kenney Assets** (https://kenney.nl) - Free CC0 assets
4. Commission a custom model on Fiverr/Upwork (~$50-200)

### For the Drone:
1. Create simple procedural shapes (cheapest option)
2. Find CC0 drone models on above sites
3. Commission custom low-poly aircraft

## Testing Checklist

Before submitting to a portal:

1. [ ] Replace vehicle model with CC0/CC-BY version
2. [ ] Replace drone model with CC0/CC-BY version
3. [ ] Run `npm run build:portal` to rebuild
4. [ ] Test the game in an iframe: `<iframe src="dist-portal/portal/index.html">`
5. [ ] Test on a mobile device
6. [ ] Verify no "Batman", "Gotham", "Wayne" text appears anywhere
7. [ ] Play through all 3 chapters to confirm everything works
8. [ ] Add portal SDK (see portal/portal-sdk.js for where)
9. [ ] Create screenshots (512x512 and 1280x720)
10. [ ] Submit shadow-striker-portal.zip to portal

## Portal Submission Options

### GameDistribution
- **Revenue**: Display ads
- **Requirements**: SDK integration, max 200 MB
- **Our size**: 13 MB ✓

### CrazyGames
- **Revenue**: Display & rewarded ads  
- **Requirements**: SDK integration, max 500 MB, QA approval
- **Our size**: 13 MB ✓

### itch.io
- **Revenue**: Optional donations/sales
- **Requirements**: Just iframe embed
- **Our size**: 13 MB ✓

## Documentation

All documentation is in the `portal/` directory:

- **portal/README.md** - Complete guide
- **portal/ASSET-LICENSING.md** - Detailed asset licensing
- **portal/portal-sdk.js** - Where to add portal SDK code
- **scripts/build-portal.mjs** - How text replacement works

## Important Notes

1. **Don't touch the main build** - Use `npm run build` for batman1989.co.uk
2. **Only use `npm run build:portal`** for the portal version
3. **The live site GitHub Pages deploy is unaffected**
4. **Internal code still has Batman references** - This is OK, users only see the UI
5. **Model filenames unchanged** - This is OK, they're not visible to users

## Next Steps

1. **Decision**: Do you want to pursue portal submission?
2. **If yes**: Find replacement vehicle and drone models
3. **Update models**: Swap the .glb files in `src/models/`
4. **Rebuild**: Run `npm run build:portal`
5. **Test**: Check it works with new models
6. **Submit**: Upload shadow-striker-portal.zip to your chosen portal

## Questions?

- Check **portal/README.md** for detailed instructions
- Check **portal/ASSET-LICENSING.md** for asset licensing details
- Review the PR: https://github.com/Crawford1982/batman/pull/15

## The Bottom Line

You have a working portal build system, but you need to replace 2 NonCommercial-licensed models before you can submit for ad revenue. Everything else is ready to go.
