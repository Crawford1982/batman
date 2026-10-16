# vedit — Claude is the video editor

You edit talking-head videos by writing `edl.json` (an edit decision list). Python + ffmpeg do every deterministic step; your job is the judgement: what to cut, where graphics and b-roll go, and how it should feel.

## Pipeline

```
python vedit.py prep projects/<name>          # whisper transcript + silence/retake analysis
  -> read projects/<name>/work/transcript.md   # YOU: decide the edit
  -> write projects/<name>/edl.json
python vedit.py broll projects/<name>         # resolve b-roll (local broll/ folder or Pexels)
python vedit.py render projects/<name> --preview   # fast half-res check
python vedit.py render projects/<name>        # final
```

`prep` writes a silence-cut draft to `edl.json` only if none exists. Start from `work/edl.draft.json` when you rebuild it.

## Your editing job (in order)

1. **Read `work/transcript.md`** in full. Lines marked `POSSIBLE RETAKE` / `POSSIBLY UNFINISHED` are heuristic hints, not verdicts. Also look for unflagged retakes: a sentence said twice, false starts, "let me say that again", "um, actually", tangents the user asked to drop.
2. **Build `keep`**: start from the draft's silence-cut `keep` list and remove the spans for bad takes. Always keep the *last* complete take. Times are source seconds. For a cut mid-segment, use word times from `work/transcript.json` (`segments[].words[]`). Leave ~0.08–0.15 s of padding around speech so cuts don't clip consonants. Don't cut so tight that breaths disappear entirely; natural pacing beats jump-cut machine-gunning.
3. **Graphics** (sparingly — roughly one every 20–40 s, never stacked): a `title` for the hook or each chapter, a `lower_third` for the speaker's name once near the start, a `callout` for a key number or claim, a `list` when the speaker enumerates steps.
4. **B-roll**: 2–5 s inserts where the speaker describes something visual or abstract. Write concrete, searchable `query` strings ("hands typing on laptop", not "productivity"). Don't cover the first 3 s (the face builds trust) or a punchline.
5. **Zooms**: punch-in (`scale` 1.1–1.2) on emphasis moments to hide jump cuts; at most every ~15 s.
6. **Captions**: on by default. 2–3 words per chunk for shorts, 3–4 for long form.
7. Run `render --preview`, then report what you cut and why (list the dropped retakes with timestamps) so the user can veto anything before the full render.

If the user gives a brief ("make it punchy", "TikTok version", "no captions"), it overrides these defaults.

## edl.json schema

```jsonc
{
  "source": "raw.mp4",                  // relative to project folder
  "output": "out/final.mp4",
  "resolution": [1920, 1080],           // [1080, 1920] = vertical/TikTok (centre-cropped)
  "fps": 30,
  "font": "Arial",                      // any installed font family
  "accent": "#FFD400",                  // highlight colour for captions/graphics
  "keep": [ { "start": 0.0, "end": 12.4 } ],          // SOURCE seconds, in order, non-overlapping
  "captions": { "enabled": true, "words_per_chunk": 3, "uppercase": true },
  "graphics": [                         // "at" = SOURCE seconds (snapped to next kept frame); "duration" = output seconds
    { "type": "title",       "text": "3 FREE TOOLS",            "at": 4.2,  "duration": 2.0 },
    { "type": "lower_third", "text": "Jim", "sub": "Engineering Chaos", "at": 1.0, "duration": 3.0 },
    { "type": "callout",     "text": "$0 / month",              "at": 40.5, "duration": 2.0 },
    { "type": "list", "items": ["Transcribe", "Edit", "Render"], "at": 61.0, "duration": 4.0 }
  ],
  "broll": [                            // full-screen inserts; voice keeps playing underneath
    { "at": 30.2, "duration": 3.5, "query": "city skyline at night", "file": null, "clip_start": 0 }
  ],
  "zooms": [ { "at": 52.0, "scale": 1.15 } ],         // punch-in for the kept segment containing "at"
  "music": { "file": "music.mp3", "volume": 0.12, "duck": true }   // ducked under speech; null = none
}
```

Rules: `keep` must be sorted and non-overlapping. Captions are hidden automatically while a `title`/`list` is on screen. B-roll `file` may be a video or a still image (stills get a slow Ken Burns zoom). Leave `file` null and `vedit.py broll` fills it.

## Don'ts

- Don't hand-edit `work/` files; they're regenerated.
- Don't invent b-roll file paths — leave `file: null`.
- Don't commit `projects/*` media (gitignored).
