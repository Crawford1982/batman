# CC0 Asset Replacements - Implementation Guide

## Required Replacements for Portal Build

### 1. Vehicle Replacement (for batmobile.glb)

**Recommended: Kenney Car Kit**
- **Source**: https://kenney.nl/assets/car-kit
- **License**: CC0 1.0 (Public Domain)
- **Author**: Kenney
- **File**: Select "sedan" or "sports" model from the kit
- **Size**: ~100-200 KB per model
- **Integration**:
  1. Download the Car Kit
  2. Extract `sedan.glb` or `sports.glb`
  3. Rename to `portal-vehicle.glb`
  4. Place in `src/models/`
  5. Update vehicle loading code to reference new model
  
**Alternative: Quaternius Vehicles**
- **Source**: https://quaternius.com (Ultimate Vehicles pack)
- **License**: CC0 1.0
- **Models**: Modern car, police car, or SUV variants

### 2. Drone Replacement (for predator.glb)

**Recommended: Simple Procedural Drone**
Create using Three.js primitives:
- Central box body (1x0.4x1 units)
- Four cylinder arms
- Four rotor disc meshes
- Sphere sensor
- License: CC0 (original creation)
- Size target: 20-50 KB

**Alternative: Kenney Drone Kit**
- Check https://kenney.nl for drone/aircraft assets
- Or use simplified helicopter model from vehicle kits

## Implementation Script

```javascript
// In portal build, update model references:
// src/models/batmobile.glb → src/models/portal-vehicle.glb
// src/models/predator.glb → src/models/portal-drone.glb
```

## Quick Start

For immediate portal build:

1. Download Kenney Car Kit: https://kenney.nl/assets/car-kit
2. Extract a sedan.glb model
3. Copy to `src/models/portal-vehicle.glb`
4. For drone: Use simplified geometry or find CC0 quadcopter model
5. Rebuild portal: `npm run build:portal`

## Verification

After replacement, verify:
- [ ] Models load correctly
- [ ] Gameplay works (driving, enemy behavior)
- [ ] File sizes reasonable (<500KB each)
- [ ] Licenses documented in ASSET-LICENSING.md
- [ ] No NC-licensed files in dist-portal/

## License Confirmation

All replacements must be:
- ✓ CC0 1.0 (preferred) OR
- ✓ CC BY 4.0 (with attribution) OR
- ✓ CC BY-SA 4.0 (with attribution and share-alike)

Must NOT be:
- ✗ CC BY-NC (NonCommercial)
- ✗ CC BY-NC-SA (NonCommercial ShareAlike)
- ✗ CC BY-ND (NoDerivatives)
