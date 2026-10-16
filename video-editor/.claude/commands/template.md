---
description: Reverse-engineer the best-performing videos on this idea into a beat-by-beat template for outline + edit
argument-hint: <project-name> [shorts|long] [optional: specific video URLs to include]
---

Build a structural template for `projects/$1` from proven winners. Read `CHANNEL.md` and `brief.md` (needs `## Idea`; if it's missing, ask for the idea). Format: $ARGUMENTS (default: match the brief, or ask).

**Rule: copy the structure, never the content.** Words, jokes, footage and thumbnails stay the creator's own. The aim is to learn *why* the winners hold attention (PLAYBOOK.md: a format copied without its reason is overfitting).

1. **Find the winners.** Use vidIQ MCP tools if available, otherwise web search plus any URLs the user gave. Get 8–15 videos on this idea or the closest adjacent idea, in the requested format. Rank them by **outlier score = views ÷ that channel's median views**, not raw views, so big channels don't win just for being big. Prefer the last 12 months. Drop anything that looks botted. Pick the **top 3–5** and show the table: title, channel, subs, views, outlier score, length, age.
2. **Get transcripts** for the top picks (vidIQ transcript tool if available). If you can't get one, say so and work from the title, description and chapters only. Never invent transcript content.
3. **Deconstruct each one** into a beat map with timestamps and % of runtime:
   - **Hook (first 3–30 s), quoted verbatim:** how it covers Promise, Proof, Plan and Persona; whether it's a cold open; and how many seconds pass before the payoff is shown or teased.
   - **Beats:** setup → attempts or failures → turning point → payoff → ending. Note where the biggest moment lands (as a %) and how the video ends (abrupt, loop, CTA, teaser).
   - **Pacing:** words per minute (from the transcript) and section lengths.
   - **Packaging:** title framing pattern and thumbnail focal point.
4. **Find the shared skeleton.** What do 3 or more of them have in common? Separate what's *common to winners* from what's *one creator's personal style*. Only the common parts go in the template.
5. **Write `## Template` into brief.md:**
   - `format`, `target_duration` (the winners' median), `hook_seconds` and `payoff_at` (% of runtime)
   - the beat list, each with a % of runtime and its job ("prove it's hard", "first failure", "reveal")
   - `cold_open: yes/no` and which kind of moment opens
   - `edit_intensity`, matched to what the winners actually do
   - `sources:` the videos used, with their outlier scores
6. **Map it to the creator.** For each beat, say which of the creator's own moments or footage fills it, or what needs filming. If `work/transcript.md` exists, point at actual segment IDs (e.g. "payoff = S041–S043; use as cold open").

After that, `/outline` follows the beats and `/edit-video` uses the template's beat order, cold open and target duration.
