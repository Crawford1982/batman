# BATMAN1989 — Visual director review
13 September 2026 · reviewed baseline ab956ac · assessment, not a migration

## Visual director verdict
The game reads as a working, distinctive fan game with some attractive vehicle and presentation work, but its environment does not yet read as a premium commercial production. The vehicle/environment quality gap is conspicuous. More bloom, snow or speed streaks will not close it. Architecture, material scale, contact lighting and composition should take priority over feature count.

Evidence: I exercised flight, firing, collision, pause/restart and mobile-emulated controls with the browser test; drove using keyboard input; inspected staged theatre, railway and cathedral positions with the chase camera reset; inspected the briefing and triggered arrival sequence. Route samples use test-hook relocation rather than a full uninterrupted campaign. The review is based on rendered screenshots and runtime interaction as well as source. No physical phone was tested. Screenshots and renderer evidence are in verification/director-2026-09-13/.

## Five biggest visual giveaways
1. Architecture has inconsistent scale. The same window texture is stretched over buildings of different heights; almost every tower has the same flat cap and small rooftop box. Near buildings expose these shortcuts immediately.
2. Streets repeat too visibly. The same broad frontage rhythm, luminous window treatment and trim run down both sides. Pavements and roads look laid out by a grid rather than accumulated through a city's history.
3. Light lacks convincing surface interaction. Road pools look like soft decals, materials are largely uniform, and contact darkness is weak. Bright trim and windows reveal construction rather than directing the eye.
4. Detail density is inconsistent. A recognisable Batmobile and textured drone sit beside huge plain walls, simplistic roofs and oversized flat road strips. More detail on the hero objects makes this mismatch stronger.
5. Composition is not reliably controlled. The opening overlooks repeated roof tiles; the final ground approach puts a command sign beside a generic frontage rather than making the cathedral the dominant visual destination. Some UI/radio messages duplicate each other and compete with the imagery.

## Visual-system assessment
| System | Current judgement | Intervention |
|---|---|---|
| Batwing | Strong silhouette; attractive but small relative to UI and repeated city | Preserve model; improve material response and city framing |
| Batmobile | Recognisable and substantially better than its surroundings; dark body can lose separation | Preserve; use restrained environment reflections and contact lighting |
| Airborne city | Large enough, but texture scale and rooftops make it look artificial | Authored near-field building families, consistent floors, cheaper distant silhouettes |
| Street buildings | Recesses and trim exist, but modules and window glow repeat conspicuously | Masonry modules with cornices, believable door scale, varied frontage widths |
| Roads | Broad flat areas and bands remain obvious; surface response lacks local variation | Calibrated asphalt UVs, roughness variation, restrained puddle/reflection patches |
| Pavements/props | Drains, bollards and vents help, but repeat at even intervals | Place fewer details with a purpose: loading entrance, damaged kerb, utility access |
| Skyline | Density without enough hierarchy | Group heights; preserve landmark silhouettes and negative space |
| Windows | Most obvious scale/material weakness | Dark glass, sparse occupied clusters, blinds/interior cards, separate emission mask |
| Lighting | Cool/warm idea is coherent; wash and floating pools look artificial | Reduce uniform fill only after adding local material/contact cues |
| Enemies | Imported Reaper-like drone is credible geometry but visually modern/military | Retexture rather than replace first; colder metal, restrained markings, red optics, clear bank/breakaway |
| Impacts/EMP | Readable arcade cues; rings/particles still abstract | Keep warnings legible; improve brief flash, sparks, smoke and decay before particle count |
| Snow/weather | Establishes setting; large flakes can compete with the subject | Depth-scaled, quieter flakes; accumulate snow on believable upward surfaces |
| Fog/sky | Useful cool depth, but hard silhouettes and empty ground still expose limits | Tune depth layers around composed views; do not hide everything with thick fog |
| Camera/animation | Damped chase movement is a sound foundation | Keep controls; stage reveals through road alignment and architecture |
| UI | Gold/blue palette and condensed headings work; small labels and redundant radio can clutter | One priority message; reserve centre for action; check phone landscape |
| Briefing | Typography is stronger than the environment it overlooks | Reframe onto a finished landmark/block rather than repeated roof fields |
| Arrival | Resolution exists, but current framing does not sell the cathedral or restored city | Make cathedral façade and a visible lighting-restoration path the subject |

## Batwing verdict
The near city needs replacement-quality architecture, not a larger map. Keep existing distant boxes as background mass. Build 3–4 silhouette families with real floor spacing, setbacks, cornices and roof equipment, clustered by district. Put the first authored block on the patrol view and make the same block visible from the driving route. Stop repeating the same roof insert. Reserve the most intricate pieces for locations that can actually be approached. Rooftop water tanks and mechanical plant should imply occupied buildings, not be sprinkled uniformly.

## Batmobile verdict
The theatre is the best candidate for a first finished section because signage already supplies a focal point and an encounter already happens there. Replace about 150–200 metres of near façades on both sides. Keep collision boundaries, route width, checkpoint timing and controls. Use varied shop widths, a recessed service entrance, one alley, restrained fire escapes, kerb dirt and a marquee reflection. The railway should then read as compressed, colder and industrial; the cathedral approach should open into pale stone and warm restored shelter light. Existing geography stays.

## Asset plan — free only
- Quaternius Downtown City MegaKit Standard: first candidate for selected masonry, windows, cornices, doors and roof parts. The official Standard preview states 153 free assets and shows three example buildings; the entire product's larger counts include other editions. CC0; formats include glTF/OBJ/FBX. The Standard archive is listed as 223 MB: a source download, NOT a proposed game payload. The paid Source edition's interior shaders and engine setups are excluded from this plan. I inspected the official main and Standard preview images, not the actual mesh archive. Polygon counts, texture dimensions and material splits still require an import audit.
- Poly Haven Brick Wall 001: CC0 scanned masonry candidate, with diffuse, GL normal and roughness maps; useful on side walls and industrial sections, not stamped over every building. The asset identifies a 3 m physical width, so preserve believable scale.
- Poly Haven Asphalt 02: CC0 base for worn road aggregate. Start at 1K, with moderate roughness changes; do not call a uniformly glossy plane a wet road.
- Kenney City Kit Commercial: CC0, 50 listed files. A secondary distant-mass/prop candidate; I would not select it as the hero architecture. A simpler skyline pack does not resolve our close-range masonry problem.

No bulk pack was downloaded or integrated. Only two official Quaternius preview images were saved for the assessment. Browser-ready cost and free-file contents remain an explicit gate before importing. The references are candidates, not falsely benchmarked assets.

Sources: https://quaternius.com/packs/downtowncitymegakit.html · https://quaternius.itch.io/downtown-city-megakit · https://polyhaven.com/a/brick_wall_001 · https://polyhaven.com/a/asphalt_02 · https://kenney.nl/assets/city-kit-commercial

## Art direction plan
Palette: charcoal brick, sooted limestone, oxidised metal, cold moonlight, restrained amber occupancy. Introduce warmer light at human destinations and red only for danger. Build upward with masonry setbacks and heavy cornices; avoid bright glass office towers as the primary identity. Darken and weather stock colours, replace stock signage, make snow collect on ledges, and group lit rooms by floor/occupancy rather than random all-over sparkle. Keep masonry dimensions consistent between air and road views. Author a few strong silhouettes instead of randomly combining everything.

## Technology and performance
Current stack: JavaScript, Vite 8.2.2, Three.js 0.185.1, WebGLRenderer, MeshStandardMaterial, ACES tone mapping and UnrealBloomPass. The latter is a Three.js effect, not evidence of Unreal Engine. Current quality settings reduce pixel ratio, bloom and world detail; spatial instance batches and merged street chunks already exist. Source inspection found no active shadow-map setup or assigned environment map despite an envMapIntensity setting.

The realistic ceiling is a convincing, tightly art-directed stylised cinematic game with selected high-quality hero views. Full modern AAA dynamic illumination and dense geometry across an unrestricted city on every phone is not a reasonable promise. Our present bottleneck is content/composition, not proof that WebGL is exhausted.

Observed staged driving samples: about 109–142 reported draw calls and 170k–202k reported triangles. Those renderer.info totals include passes and are not unique asset polygon counts. The fresh automated Edge session reported ANGLE Intel HD Graphics 4600, not GTX 1650, and about 24–30 FPS. Earlier parallel test FPS is not useful as a benchmark. These numbers do not establish GTX or phone performance. Re-baseline on the intended GPU and physical phones before raising visual budgets.

Provisional first-block acceptance budgets, to be measured rather than assumed:
- At most 5 MB extra compressed network transfer for the first authored environment slice; stage it after the menu and before entry.
- Approximately 32 MB incremental texture memory on mobile as a starting cap. A 1K RGBA8 texture with mipmaps is about 5.3 MiB; JPEG/WebP file size is not GPU memory usage. Three maps at 1K already approach 16 MiB.
- Seek no more than 20 additional visible draws and roughly 100k additional near-field triangles on desktop, with a lighter mobile tier. These are ceilings, not quotas to fill.
- Preserve the existing frame-time baseline within 10% on the same device/settings; target 60 FPS on appropriate hardware, accept a deliberate lower tier rather than advertise guaranteed 60 everywhere.
- Use 512–1K materials, atlas compatible surfaces, merge static façade pieces per cell/material and reuse geometry. Use KTX2 only after testing transcoder/device behaviour; avoid adding complexity without measured memory benefit.
- Near: detailed modules and baked occlusion; mid: merged simplified façades; far: silhouette mass. Hysteresis/fade avoids visible LOD popping.
- Baked lighting/contact AO and one or two targeted effects before city-wide dynamic shadows. Screen-space reflections/volumetrics only as separately profiled optional features.

WebGPU is a later capability experiment, not a visual-upgrade button. Three.js provides WebGPU with WebGL2 fallback, but our GLSL ShaderMaterial effects and post-processing path need compatibility work; do not treat changing the renderer constructor as a migration plan. Babylon would similarly incur integration work without repairing asset direction by itself.
Source: https://threejs.org/docs/pages/WebGPURenderer.html

## Unreal verdict
Choose C: Blender/professional assets plus the existing browser engine. This also implements B, a substantial asset/rendering upgrade. Do not prototype or migrate Unreal now.

Unreal would materially improve editor tooling, cinematic sequencing, animation workflows, lighting iteration and access to its advanced rendering systems on suitable hardware. It would not automatically turn weak art into good art. The JavaScript gameplay/Three.js scene code would need substantial rewriting in Blueprint/C++; model geometry, textures, sounds and narrative can be reused subject to their original licences. HTML UI, touch input, save behaviour, tests and hosting integration require rebuilding or adaptation.

Planning estimate, not a quote: several weeks for a representative Unreal prototype and roughly 2–4+ months of focused solo development for two-chapter feature parity, polish and delivery validation. Content creation remains additional work and can dominate either engine choice.

Epic's current deployment documentation directs browser access through Pixel Streaming. It runs the game on a remote GPU-equipped machine and sends video plus receives input through WebRTC; this needs runtime/signalling infrastructure, often TURN, and ongoing compute/bandwidth costs. GitHub Pages cannot run that backend. Independent player sessions require capacity planning, unlike a static asset download. Compression, network latency, queues/cold starts and service operation become product concerns. Third-party HTML5/WebGPU export paths need their own proof; none was established here as a maintained drop-in alternative for this project. Do not assume the historical HTML5 sentence in the overview means a supported UE5 static export matching our current site.

Sources: https://dev.epicgames.com/documentation/en-us/unreal-engine/sharing-and-releasing-projects-for-unreal-engine · https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-pixel-streaming-in-unreal-engine

## PC + Unreal
Observed: Intel Core i7-4790 3.60 GHz, 4 cores/8 threads; NVIDIA GTX 1650 4096 MiB VRAM; integrated Intel HD 4600; 31.9 GiB usable RAM; Windows 11 Pro 10.0.22631. C: has about 10.5 GiB free. G: reports about 348.5 GiB free and I: about 789.2 GiB free; disk type/speed and suitability for project storage were not established.

Verdict: USABLE for modest Unreal work at reduced settings, not GOOD for the visually ambitious UE5 workflow proposed. It should run the editor, but this was not empirically tested and Unreal was not installed. RAM meets Epic's 32 GB recommendation, while 4 GB VRAM is below the 8 GB recommendation. The GTX is outside the GPU families listed for Lumen/MegaLights on the current requirements page. The older 4-core CPU will constrain compilation and content processing. Spare storage exists on other volumes, so low C: space is not a statement that the whole PC lacks room; editor/cache paths would need planning. For current Three.js/Blender optimisation work, retaining this machine makes far more sense than choosing a new engine around it.
Source: https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine

## Highest ROI upgrade and implementation plan
ONE change: a fully art-directed theatre/downtown block, readable both from the Batmobile and on a Batwing flyover. It establishes the architectural/material standard that the rest of Gotham can inherit.

1. Preserve baseline ab956ac; create a separate codex/environment-slice branch/checkpoint before editing game content. Keep current controls, missions and original assets intact.
2. Import only a representative free module/building. Audit triangles, materials, textures, licence file and export size. Reject it if reworking it costs more than building the necessary module.
3. Build the 150–200 m block in Blender or a small isolated assembly scene. Validate façade dimensions, roof view and three planned camera compositions. Bake/contact-shade and optimise before integration.
4. Integrate behind a reversible setting. Retain the current world as fallback. Preserve collision envelopes and test all route corners, pursuit, ambush, checkpoints and chapter transitions.
5. Compare identical before/after shots at ground and flight height. Measure download size, GPU memory estimates, draws, p50/p95 frame times and frame stalls on fixed hardware/settings. Check phone touch/audio/performance on a physical device.
6. Only after the block passes, extend its families to the opening flyover, railway and cathedral. Recompose the arrival around the actual landmark, then reassess enemy materials and UI clutter.

No gameplay/rendering code was changed or deployed in this assessment. The strongest next action is asset qualification and the authored block, not a small unrelated polish patch. Existing tests/browser.mjs and tests/visual-pass.mjs passed; tests/director-review.mjs records the new inspection route and renderer evidence.
