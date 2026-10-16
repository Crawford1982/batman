# vedit: free AI video editing with Claude Code

A local, near-free replacement for the ChatCut-plus-Claude workflow ("Opus 5.5 is INSANE at video editing"). Claude Code edits your raw talking-head video from plain-English prompts. It removes silences and retakes, adds motion graphics, word-by-word captions, b-roll and ducked music, then exports for YouTube or TikTok.

| | ChatCut workflow | vedit |
|---|---|---|
| AI editor | Claude + ChatCut MCP (paid plan) | Claude Code (your existing subscription) |
| Transcription | ChatCut cloud | faster-whisper, local, free |
| Cuts / render | ChatCut cloud | ffmpeg, local, free |
| Motion graphics | ChatCut templates | ASS animated titles, lower thirds, callouts, lists (libass) |
| B-roll | ChatCut library | your own `broll/` folder, or the Pexels free API |
| Manual tweaks | ChatCut browser timeline | `timeline.html` (static, offline) |
| Upload limits / watermark | per plan | none, and your footage never leaves your PC |

**Cost:** £0 beyond Claude. Pexels keys are free and the footage is free to use without attribution. For music, use the YouTube Audio Library or Pixabay Music.

## How it works (deterministic → AI → static)

```
raw.mp4 ─▶ prep ─▶ work/transcript.md ─▶ Claude writes edl.json ─▶ broll ─▶ render ─▶ out/final.mp4
         (whisper + silence +           (cuts, graphics,          (fetch     (ffmpeg, 2 passes)
          retake detection)              b-roll, zooms)            clips)
                                               ▲
                                timeline.html (manual tweaks)
```

Claude only writes a JSON edit list, so every render is reproducible, diffable and editable by hand.

## The whole loop, not just the edit

Editing is one stage of five, and any single weak stage can sink a video. [PLAYBOOK.md](PLAYBOOK.md) covers the full process (adapted from Jake Trinder's framework for a solo creator). Each stage has a command, and they all share `projects/<name>/brief.md`:

```
/idea-check <name> <idea>   demand: floor/ceiling, is it current, stack for a higher ceiling
/package <name>             titles + thumbnails from proven framing patterns -> promise + edit intensity
/outline <name>             4P hook + acceptance-criteria outline -> film this
/edit-video <name>          edit matched to the promise, hook audited
/post-mortem <name>         read results -> lessons go into CLAUDE.md "House style"
```

## Setup (Windows, one time)

```powershell
winget install Gyan.FFmpeg          # ffmpeg + ffprobe on PATH (reopen the terminal afterwards)
winget install Python.Python.3.12
cd video-editor
pip install -r requirements.txt     # faster-whisper; the model downloads on first run (~500 MB for "small")
# optional, for automatic b-roll: free key from https://www.pexels.com/api/
setx PEXELS_API_KEY "your-key"
```

An NVIDIA GPU is used automatically if CUDA is installed. Otherwise Whisper runs on the CPU: the `small` model takes roughly real time on a modern laptop. Use `--model base` for speed or `--model medium` for accuracy.

## Use it

1. Make a folder `projects/my-video/` and drop in `raw.mp4`. Optionally add `music.mp3` and a `broll/` folder of clips named by content (e.g. `broll/iron-man-helmet-closeup.mp4`).
2. Open Claude Code in `video-editor/` and run:
   ```
   /edit-video my-video punchy, cut all retakes, add b-roll, music at low volume
   ```
   Claude transcribes, edits, renders a fast preview, then lists every cut so you can veto it.
3. Optional manual pass: open `timeline.html` in Edge or Chrome and click **Open project folder**. Double-click words to cut or restore them, then press **+ title here** and similar buttons to add graphics. Download `edl.json` and replace the project's copy.
4. Final render: `python vedit.py render projects/my-video`.

For a TikTok or Shorts version, ask Claude for a vertical cut. It sets `"resolution": [1080, 1920]` and an `output` such as `out/vertical.mp4`, and captions move above the TikTok UI. One recording can give you both formats.

### Manual commands

```
python vedit.py prep    projects/my-video [--model small] [--language en]
python vedit.py analyze projects/my-video [--noise-db -35] [--min-silence 0.45]
python vedit.py broll   projects/my-video
python vedit.py render  projects/my-video [--preview]
```

The edl.json schema and the editing rules Claude follows are in [CLAUDE.md](CLAUDE.md).

## Honest limits

- **Retake detection is a heuristic.** It catches repeated sentence openings and unfinished lines. Claude catches more by reading, but always skim the cut list before a final render.
- **Graphics are text animations, not After Effects.** They give clean, modern titles, lower thirds, callouts and lists. For heavier motion design, Remotion (free for individuals) can render React components to video and then be dropped in as b-roll.
- **Whisper word timings** can drift ~50–100 ms. The cut padding absorbs that. If a cut clips a word, widen the `keep` span slightly in the timeline.
- **The timeline previews cuts only.** Graphics and captions appear in the render (use `--preview` for a quick check).
