# ⚠️ REQUIRED: Replace NonCommercial Assets

## Status: ACTION REQUIRED BEFORE PORTAL SUBMISSION

The portal build currently includes two assets with NonCommercial licenses that **MUST** be replaced before submitting to any ad-supported game portal.

### Files Requiring Replacement

#### 1. Vehicle Model
- **Current File**: `src/models/batmobile.glb` (1.1 MB)
- **License**: CC BY-NC-SA 3.0 ❌ (NonCommercial)
- **Status**: 🔴 NOT SUITABLE FOR COMMERCIAL USE
- **Action**: Replace before portal submission

#### 2. Drone Model  
- **Current File**: `src/models/predator.glb` (536 KB)
- **License**: CC BY-NC-SA 4.0 ❌ (NonCommercial)
- **Status**: 🔴 NOT SUITABLE FOR COMMERCIAL USE
- **Action**: Replace before portal submission

---

## Recommended CC0 Replacements

### Option 1: Kenney Assets (Easiest)

**For Vehicle:**
1. Visit: https://kenney.nl/assets/car-kit
2. Download the Car Kit (free, CC0)
3. Extract a suitable model (sedan, sports, or SUV)
4. Rename to `nightblade.glb`
5. Copy to `src/models/nightblade.glb`
6. Update `src/ground-level.js` line that loads `batmobile.glb` to load `nightblade.glb`
7. Test driving chapter works

**For Drone:**
1. Visit: https://kenney.nl (search for drone or aircraft models)
2. Or use a simple helicopter/drone from vehicle kits
3. Rename to `surveillance-drone.glb`
4. Copy to `src/models/surveillance-drone.glb`
5. Update `src/pursuit-drone.js` line that loads `predator.glb` to load `surveillance-drone.glb`
6. May need to adjust scale/orientation in code
7. Test flight chapter enemies work

### Option 2: Quaternius Assets

**For Vehicle:**
1. Visit: https://quaternius.com (Ultimate Vehicles pack)
2. Download pack (free, CC0)
3. Choose a tactical-looking vehicle
4. Follow same steps as Kenney option

**For Drone:**
1. Check Quaternius packs for aircraft/drones
2. Or use simplified helicopter model
3. Follow same steps as Kenney option

### Option 3: Commission Custom Models

- Cost: ~$50-200 per model on Fiverr/Upwork
- Request CC0 or CC-BY license
- Specify tactical/noir theme
- Provide dimensions based on existing models

---

## Step-by-Step Integration

### 1. Download CC0 Models
Choose Option 1 or 2 above

### 2. Update Model References

**For Vehicle** (`src/ground-level.js`):
```javascript
// Find this line:
import batmobileUrl from "./models/batmobile.glb?url";

// Replace with:
import vehicleUrl from "./models/nightblade.glb?url";

// Update all references from batmobileUrl to vehicleUrl
```

**For Drone** (`src/pursuit-drone.js` or wherever predator is loaded):
```javascript
// Find this line:
import predatorUrl from "./models/predator.glb?url";

// Replace with:
import droneUrl from "./models/surveillance-drone.glb?url";

// Update all references from predatorUrl to droneUrl
```

### 3. Adjust Scale/Orientation (if needed)

Models may need scaling or rotation adjustments:
```javascript
// In model loading code:
model.scale.setScalar(1.5); // Adjust as needed
model.rotation.y = Math.PI; // Rotate 180° if facing wrong way
```

### 4. Test Gameplay

```bash
npm run dev:portal
```

Test:
- [ ] Driving chapter loads and works
- [ ] Vehicle drives correctly
- [ ] Flight chapter enemies appear and work
- [ ] Drones fly and attack properly
- [ ] Collisions work
- [ ] No visual glitches

### 5. Rebuild Portal

```bash
npm run build:portal
```

### 6. Update Asset Documentation

Edit `portal/ASSET-LICENSING.md`:
- Add exact model names used
- Add source URLs
- Add author names
- Confirm CC0 or CC-BY license
- Add file sizes

### 7. Verify No NC Licenses

```bash
# Check dist-portal doesn't contain NC-licensed files
find dist-portal -name "batmobile.glb" -o -name "predator.glb"
# Should return nothing
```

---

## Verification Checklist

Before portal submission:

- [ ] Downloaded CC0 vehicle model
- [ ] Downloaded CC0 drone model
- [ ] Updated `src/ground-level.js` vehicle reference
- [ ] Updated drone loading code
- [ ] Tested driving chapter works
- [ ] Tested flight enemies work
- [ ] Adjusted scale/orientation if needed
- [ ] Ran `npm run build:portal`
- [ ] Verified no `batmobile.glb` in dist-portal
- [ ] Verified no `predator.glb` in dist-portal
- [ ] Updated ASSET-LICENSING.md with new model details
- [ ] File sizes reasonable (< 500KB each preferred)
- [ ] Ran tests: `npm test`

---

## Current Build Status

⚠️ **The portal build infrastructure is complete and functional.**

⚠️ **However, it currently still uses the NC-licensed models for testing.**

⚠️ **You MUST complete the replacement steps above before:**
- Submitting to GameDistribution
- Submitting to CrazyGames  
- Submitting to itch.io with paid features
- Any commercial or ad-supported use

🔒 **The live batman1989.co.uk site is NOT affected and can continue using the original models.**

---

## Quick Reference

| Asset | Current (NC) | Replacement | Source | License |
|-------|-------------|-------------|---------|---------|
| Vehicle | batmobile.glb (1.1MB) | nightblade.glb | Kenney Car Kit | CC0 1.0 ✓ |
| Drone | predator.glb (536KB) | surveillance-drone.glb | Kenney/Quaternius | CC0 1.0 ✓ |

**Estimated time to complete**: 1-2 hours including download, integration, and testing.

**Priority**: 🔴 **HIGH** - Required before any commercial portal submission.