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
