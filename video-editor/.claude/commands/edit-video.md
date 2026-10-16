---
description: Edit a raw video in projects/ end-to-end (transcribe, cut retakes, graphics, b-roll, render)
argument-hint: <project-folder-name> [brief, e.g. "punchy TikTok cut, no music"]
---

Edit the video in `projects/$1` following CLAUDE.md. Extra brief from the user: $ARGUMENTS

1. If `projects/$1/work/transcript.md` doesn't exist, run `python vedit.py prep projects/$1` (add `--language en` if the speech is English).
2. Read `work/transcript.md` fully, and `work/transcript.json` for word timings where you need a mid-segment cut.
3. Write `projects/$1/edl.json` per the CLAUDE.md editing job and schema, honouring the brief.
4. If the EDL has b-roll, run `python vedit.py broll projects/$1`.
5. Run `python vedit.py render projects/$1 --preview`.
6. Report: final duration vs raw, every retake/section you cut (with source timestamps and a one-line reason), the graphics and b-roll you added, and any b-roll still missing. Ask whether to tweak or run the full render (`python vedit.py render projects/$1`).
