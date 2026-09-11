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
