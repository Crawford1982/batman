# Ranked development backlog

## Completed this pass

Chapter II street architecture, signs, wet asphalt, lighting, railway passage, arched Old Gotham frontage and cathedral searchlights. Imported, optimized Predator pursuers with banking, sensors and strike beams. Mechanical mines, EMP arcs, sparks, smoke, steam and tire spray. Batmobile geometry optimization, batched scenery/effects, route-clearance checks, production gameplay verification and corrected FPS reporting.

## Chapter III — status (5 October 2026)

Branch `chapter-3/rooftop-mission`, built on `claude/adoring-meitner-s8m5t0` (the unmerged Batcave prototype). Merging it brings both.

Note on "pass 1": `src/grapple.js` / `src/grapple-level.js` (pendulum physics, capsule rig, Old Gotham rooftop grid) were never pushed to GitHub; no branch or commit contains them. With the owner's agreement this pass builds on the Batcave chapter instead. If that pass-1 code exists locally, reconcile it with this branch before merging either.

**Done in this pass — Chapter III part two, Kessler Cold Storage rooftops**
- Mission continues from the Batcave deduction (Kessler Cold Storage, The Narrows). The Batcave results screen now offers CONTINUE / KESSLER ROOFTOPS; the menu has a separate PROTOTYPE entry.
- Objectives: disable three uplink dishes (they re-key the hijack carrier), copy the flight log (locked until the dishes are down), extract at the water tower. Lose on three alarms or the six-minute purge clock.
- Answers Silent Bell's open thread: the hijacker is TOLLER, Ines Varga, an original character (ex-Wayne Aerospace engineer whose shelved remote-override autopilot was used on the aircraft). Not a DC character.
- Non-lethal stealth: guards patrol routes with vision cones (15 m, 90°, blocked by vents and plant rooms), go patrol → suspicious → alert → search → patrol, and radio same-roof or nearby crew. The player avoids them or EMP-stuns them from behind; there is no shooting.
- Grapple-to-roof zip (aim cone + reach), camera-relative movement, keyboard, touch stick/buttons and standard gamepad mapping.
- Original capsule placeholder replaced with Quaternius "Animated Human" (CC0, OpenGameArt). Converted by scripts/prepare-operative.mjs, compressed (1,578 triangles, 0.40 MB), credited in public/credits.html with licence and notes in public/characters/. Placeholders remain only as a download-failure fallback.
- Chapter card, text-only radio captions (src/radio-lines.js ROOFTOP_LINES, no recordings claimed), results screen and best-time storage under "rooftops".
- Fixed: a global `.intro { display: none }` rule (max-height 550px) hid the Batcave HUD and its Skip button during the intro on phone landscape. HUD state class renamed to `cinematic` in both chapters.
- Tests: tests/rooftop.test.js (15 pure-logic tests: layout, reachability, vision, grapple, state transitions, takedown rules, objectives, win/loss, reset, score). tests/rooftop.mjs browser check (desktop + phone landscape). cave/flight/driving browser checks re-run and passing.

**Pass 3 should pick up**
1. Human playtest and balance. Only scripted checks have played it; tune guard routes, cone size, suspicion rates, hack times and the 6:00 clock from real runs.
2. Cone readability: clip cones to the roof edge (they overhang the street) and show cover shadows; cover is honoured by the logic but not drawn.
3. Stunned guards should be discoverable: a patrol seeing a downed colleague goes to search.
4. Traversal feel: swap the straight zip for swing physics if the pass-1 pendulum code turns up; the mission only depends on `player.zip` and `player.roof`.
5. Silhouette: the CC0 figure has no cape or cowl. Either source a CC-licensed cape/cowl add-on or keep the deliberately generic operative (lower IP risk).
6. CI: add tests/cave.mjs and tests/rooftop.mjs to the browser workflow, and change cave.mjs to click Skip through Playwright, not element.click(); that is why it missed the mobile HUD bug.
7. Lighting legibility on rooftops (dark roofs read poorly); keep separate from the landmarks pass.
8. Owner-only: phone and physical-controller session for the new controls (touch stick, ACT hold, GRAPPLE).

## Next — ranked

0. **Real-device session.** Ten minutes on a physical phone (touch stick, audio unlock on first tap, turbine mix on the speaker) and a headphones audition of the countdown ticks. Everything below is desktop-emulation verified only. Owner task; no agent can close it.
1. **Browser performance and physical-device profiling.** Benchmark the GTX 1650 and actual phones, add vehicle/environment LOD and tune resolution scaling. The Intel HD 4600 sample remains below target; establish a reliable frame budget before adding content. Medium difficulty, very high impact. **Recommended next pass.**
2. **Distinct architectural landmarks.** Bespoke theatre frontage, industrial utility runs and a more detailed cathedral plaza, reducing remaining repeated façade patterns. Medium difficulty, high impact.
3. **Driving feel and tire feedback.** Physical controller tuning, skid ribbons, tire audio and stronger wet-road grip cues. Medium difficulty, high impact.
4. **Readable pursuit escalation.** A new armored road enemy and meaningful escape/neutralization states, with careful encounter spacing. Hard difficulty, high impact.
5. **Campaign polish.** Save chapter progress, add best times and a short real-time cathedral handover ending. Medium difficulty, medium impact.

## Deliberately postponed

Real-time reflections, heavy volumetrics, new vehicle combat mechanics, traffic simulation, a complete skyline replacement and the Chapter I enemy overhaul. Keep the next pass bounded and review the current visual changes first.
