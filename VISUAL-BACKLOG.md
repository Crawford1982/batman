# Visual production backlog
Updated 13 September 2026. Free assets only. Keep gameplay, instant browser access and mobile support.

## Current pass
- [x] Qualify a small subset of Quaternius Standard (CC0), optimise and document cost.
- [x] Replace one 140-metre theatre block; eight instanced masonry buildings, shared texture kit, original geometry fallback.
- [x] Inspect road/air views; verify download fallback and road bounds. Ground/browser tests and build pass.
- [ ] Physical-phone sustained performance and fixed-GPU p95 timing remain unverified. Current snapshot: +20 draws, about +102k rendered triangles near the block.
- [ ] Extend masonry beyond the first block, improve rooftop snow, and replace adjoining old façades only after those measurements.

## Next, in order of value
1. **Flight architecture scale** — consistent floor/window sizes, distinct roof silhouettes, 3–4 building families around the opening patrol. Preserve distant instance batches. Medium/large pass.
2. **Road material and lighting** — calibrated CC0 asphalt/stone, varied roughness, baked contact darkness, convincing local wet patches. Small/medium pass after block acceptance.
3. **Cathedral payoff** — reveal the actual cathedral, restore lights across visible architecture, compose the arrival around the landmark rather than a sign. Medium pass.
4. **Railway district** — credible steel structure, utility walls, a few authored service details and colder lighting. Medium pass.
5. **Enemy treatment** — darker cohesive materials, red optics, readable damaged-state smoke and attack silhouettes. Small/medium pass; reuse models.
6. **Window occupancy and skyline depth** — sparse grouped emissive rooms, darker glass, better distant silhouette hierarchy. Medium pass.
7. **UI message hierarchy** — remove duplicate radio text, shorten competing centre overlays, preserve touch clarity. Small pass.
8. **Measured visual tiers** — baseline on GTX 1650 and physical phones; report p50/p95 frame times, texture memory and draw counts. Existing automated Edge selects Intel HD 4600. Do not call emulation a phone benchmark.

## Deferred
- Unreal migration, new chapters, larger city, bulk asset imports, blanket real-time shadows and SSR.
- WebGPU only after a specific measured bottleneck justifies shader/post-processing migration.

## Release gates
Payload: run `npm run compress` on every new model before commit and judge size from `dist/assets/*.glb`, not the source file. The first theatre block was 4.8 MB uncompressed and loaded at the start of Chapter II; compressed it is 0.79 MB. Do not extend the masonry until that is the habit.
Before/after pictures at identical positions; safe collision envelopes; fallback when assets fail; source/licence record; compressed bytes and texture sizes; relevant tests and production build. Never fill remaining usage merely because it is available.


## Refinement pass � 13 September 2026
- [x] Correct projector cone direction; soften and break up the cloud projection.
- [x] Reduce window glare with per-room brightness, softened edges and interior shading.
- [x] Preserve black hull highlights with a minimum roughness after texture sampling.
- [x] Reserve pointed crowns for rare tall towers; vary their proportions.
- [x] Reduce street glow, grain and edge colour fringing.
- [ ] Author more varied street facades and road materials; this pass only moderates their lighting.
- [ ] Remove duplicated flight radio text and review message hierarchy.
- [ ] Physical-phone visual/performance check remains a user-device task.
