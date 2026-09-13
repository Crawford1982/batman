# Polish pass — local review only

- Branch: `polish/feedback-pass`, based on `fix/frame-stall-handling`.
- No push, PR or deployment. The supplied HANDOFF-PROMPT.md remains untracked.
- Task 1: shared damage vignette/shake and four recycled reward labels in both chapters;
  existing car spark pool retained; existing Batman replies gated by 8-second cooldown
  and never interrupt active speech. Reduced motion keeps the vignette but skips shake/float.
- Task 1 validation: queue tests, full driving and flight browser scenarios.
- Updated the stale flight victory/replay test to follow the existing cinematic handover.
- Task 2: speed-driven turbine, boost air transient, amber/red clocks, soft countdown
  ticks and a separate melodic bus that fades during the final 15 seconds.
- Task 2 validation: monotonic target/boundary tests, driving regression and audio-clock
  browser checks covering both chapters, pause gating and reset. Owner should audition mix.
- Task 3: one-key best-result storage with legacy migration; new-best delta and time
  remaining on wins. Tested ties, failures, corrupt/private storage and mobile result text.
- Task 4: opening strikes wait for checkpoint 1 or 25 seconds, then a three-second
  warning. Later cadence and corner/ambush protections remain intact. The warning is
  text-only Gordon dialogue; existing recordings were not changed or fabricated.
- Task 4 validation: desktop/mobile opening boundary and warning-lead checks added
  to drone-strikes.mjs; barrage, EMP, damage, bonus and replay checks passed.
- All 35 unit tests pass; final production build passes (existing bundle-size warning).
- Deferred tasks 5–7 (flight HUD, Batwing loading readout, dependencies/CI) to stop
  safely before the 60% allowance ceiling. Latest check: 52% used / 48% remaining.
- Next: owner audition of turbine mix and hit/reward feel on a real phone; then HUD
  simplification with before/after captures. No real-device performance claim is made.
- Test commands run: npm test; tests/ground.mjs; tests/browser.mjs;
  tests/audio-clock.mjs; tests/presentation.mjs; tests/ground-presentation.mjs;
  tests/drone-strikes.mjs; npm run build.

- Follow-up: task 5 HUD consolidation passed desktop/portrait/landscape and bomber checks.
- Task 6 measured download progress passed a throttled-network browser check.
- Task 7 moved Vite/Playwright to devDependencies; npm install, 36 tests and build passed.
- Added push/PR test-build CI. Release NOT performed: quota reached 100% before merge/deploy.
- Remaining: review final commits, merge polish/feedback-pass into main, push and deploy Pages.

- Release resumed with owner authorization after quota reset. Re-ran all 36 unit tests,
  production build, desktop/mobile flight, driving and handover failure/retry checks: passed.
- Prior no-push/no-deploy restriction superseded by owner's release instruction.

## 13 September 2026 — post-release commits and hardening

Landed on main after the release (not covered by the notes above):
- e7673a6 adaptive driving score and theatre interceptor pursuit set-piece at checkpoint 1.
- df0dcc0 driving melody clarified, exhaust anchored to the rear nozzle.
- ab956ac boost edge streaks and turbine surge.
- 9f71805 first theatre block replaced with CC0 Quaternius masonry (see VISUAL-BACKLOG.md).

Hardening pass (separate PRs):
- #1 Models compressed with meshopt + WebP: 16.4 MB -> 2.9 MB. `npm run compress` after any prepare script.
- #2 Prettier, .editorconfig, .gitattributes; flight camera shake no longer feeds back into the chase lerp.
- #3 CI runs tests/browser.mjs and tests/ground.mjs on Ubuntu through Playwright-installed Edge.
- #4 Models served as content-hashed assets/<name>-<hash>.glb so browsers cache them past Pages' 10-minute max-age.
- #5 Driving score bus raised from 0.75 to 1.0 at rest (owner found Chapter II music quiet).
- #6 WebGL context loss pauses with a message and recovers on restore; tests/context-lost.mjs.

Rule for future environment work: any new model must go through `npm run compress` before commit, and its
uncompressed size is not the number that matters — check `dist/assets/*.glb` after a build.

Still owner-only: real phone session (touch stick, audio unlock, turbine mix on speaker), headphones audition
of the countdown ticks, and direction for the Chapter I entrance and cathedral ending cinematics.
