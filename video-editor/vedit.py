#!/usr/bin/env python3
"""vedit - a free, local, Claude-driven video editor.

Pipeline (deterministic -> AI -> static):
  1. prep     transcribe (faster-whisper) + analyse (silences, retakes) -> work/
  2. (Claude) reads work/transcript.md, writes edl.json  (see CLAUDE.md)
  3. broll    fetch b-roll clips the EDL asks for (local folder or Pexels)
  4. render   ffmpeg cut + b-roll + motion graphics + captions + music -> out/

Only stdlib is required, except `faster-whisper` for transcription.
Usage: python vedit.py <command> <project-dir>   (run with -h for details)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".m4v", ".avi"}
AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"}


# ---------------------------------------------------------------- helpers

def run(cmd: list[str], cwd: Path | None = None, quiet: bool = True) -> str:
    if not quiet:
        print("$", " ".join(str(c) for c in cmd))
    p = subprocess.run([str(c) for c in cmd], cwd=cwd, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if p.returncode != 0:
        sys.exit(f"command failed: {' '.join(map(str, cmd))}\n{p.stderr[-3000:]}")
    return p.stdout + p.stderr


def need(tool: str) -> None:
    if not shutil.which(tool):
        sys.exit(f"'{tool}' not found on PATH. Install ffmpeg (winget install Gyan.FFmpeg).")


def probe(path: Path) -> dict:
    out = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format",
               "-show_streams", path])
    info = json.loads(out[out.index("{"):])
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    fps = 30.0
    if v and v.get("avg_frame_rate", "0/0") != "0/0":
        n, d = v["avg_frame_rate"].split("/")
        fps = float(n) / float(d or 1)
    return {"duration": float(info["format"]["duration"]),
            "width": int(v["width"]) if v else 0, "height": int(v["height"]) if v else 0,
            "fps": fps, "has_audio": a is not None}


def find_source(proj: Path) -> Path:
    edl = proj / "edl.json"
    if edl.exists():
        src = json.loads(edl.read_text("utf-8")).get("source")
        if src and (proj / src).exists():
            return proj / src
    vids = sorted(p for p in proj.iterdir() if p.suffix.lower() in VIDEO_EXTS)
    if not vids:
        sys.exit(f"no video file found in {proj}. Put your raw recording there.")
    return vids[0]


def ts(t: float) -> str:
    m, s = divmod(max(t, 0), 60)
    return f"{int(m):02d}:{s:05.2f}"


def load_json(p: Path) -> dict:
    return json.loads(p.read_text("utf-8"))


def save_json(p: Path, data) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False), "utf-8")


# ---------------------------------------------------------------- 1a. transcribe

def cmd_transcribe(proj: Path, model: str, language: str | None) -> None:
    need("ffmpeg")
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("faster-whisper missing: pip install -r requirements.txt")
    src = find_source(proj)
    work = proj / "work"
    work.mkdir(exist_ok=True)
    wav = work / "audio16k.wav"
    run(["ffmpeg", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", wav])
    print(f"transcribing {src.name} with whisper '{model}' (first run downloads the model)...")
    wm = WhisperModel(model, device="auto", compute_type="auto")
    segs, info = wm.transcribe(str(wav), word_timestamps=True, language=language,
                               vad_filter=False, condition_on_previous_text=False)
    out = []
    for i, s in enumerate(segs):
        words = [{"w": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)}
                 for w in (s.words or []) if w.word.strip()]
        out.append({"id": i, "start": round(s.start, 3), "end": round(s.end, 3),
                    "text": s.text.strip(), "words": words})
        print(f"  {ts(s.start)} {s.text.strip()[:70]}")
    save_json(work / "transcript.json", {"source": src.name, "language": info.language,
                                         "segments": out})
    print(f"wrote {work / 'transcript.json'}")


# ---------------------------------------------------------------- 1b. analyse

def detect_silences(src: Path, noise_db: float, min_len: float) -> list[tuple[float, float]]:
    out = run(["ffmpeg", "-i", src, "-vn", "-af",
               f"silencedetect=noise={noise_db}dB:d={min_len}", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    return [(max(s, 0), e) for s, e in zip(starts, ends)] + (
        [(starts[-1], 1e9)] if len(starts) > len(ends) else [])


def norm_words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", text.lower())


def find_retakes(segs: list[dict]) -> dict[int, str]:
    """Flag segments that look like an abandoned attempt at a following segment."""
    flags: dict[int, str] = {}
    for i, a in enumerate(segs):
        wa = norm_words(a["text"])
        if len(wa) < 2:
            continue
        for b in segs[i + 1:i + 4]:
            wb = norm_words(b["text"])
            n = min(3, len(wa), len(wb))
            if n >= 2 and wa[:n] == wb[:n]:
                flags[a["id"]] = f"POSSIBLE RETAKE: S{b['id']:03d} restarts with the same words"
                break
        else:
            if a["text"].rstrip().endswith(("-", "...", "\u2026", ",")):
                flags[a["id"]] = "POSSIBLY UNFINISHED sentence"
    return flags


def speech_islands(segs: list[dict], silences: list[tuple[float, float]], dur: float,
                   pad: float, join_gap: float) -> list[dict]:
    """Default keep list = word-timed speech, padded, with silences removed."""
    spans = []
    for s in segs:
        if s["words"]:
            spans += [(w["start"], w["end"]) for w in s["words"]]
        else:
            spans.append((s["start"], s["end"]))
    spans.sort()
    merged: list[list[float]] = []
    for a, b in spans:
        a, b = max(0.0, a - pad), min(dur, b + pad)
        if merged and a - merged[-1][1] <= join_gap:
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])
    # trim island edges that fall inside detected silences (whisper pads words)
    for m in merged:
        for s, e in silences:
            if s <= m[0] < e and e < m[1]:
                m[0] = max(m[0], e - pad)
            if s < m[1] <= e and s > m[0]:
                m[1] = min(m[1], s + pad)
    return [{"start": round(a, 3), "end": round(b, 3)} for a, b in merged if b - a > 0.15]


def cmd_analyze(proj: Path, noise_db: float, min_silence: float) -> None:
    need("ffmpeg")
    work = proj / "work"
    tr_path = work / "transcript.json"
    if not tr_path.exists():
        sys.exit("run `prep` or `transcribe` first")
    tr = load_json(tr_path)
    src = find_source(proj)
    info = probe(src)
    silences = detect_silences(src, noise_db, min_silence) if info["has_audio"] else []
    segs = tr["segments"]
    retakes = find_retakes(segs)
    keep = speech_islands(segs, silences, info["duration"], pad=0.12, join_gap=0.35)
    kept = sum(k["end"] - k["start"] for k in keep)

    lines = [f"# Transcript: {src.name}",
             f"duration {ts(info['duration'])} | {info['width']}x{info['height']} @ "
             f"{info['fps']:.2f}fps | silence-cut draft keeps {ts(kept)} "
             f"({100 * kept / max(info['duration'], 0.01):.0f}%)", "",
             "Format: [S###] start-end (source seconds) text   <- flags", ""]
    prev_end = 0.0
    for s in segs:
        gap = s["start"] - prev_end
        if gap >= 1.0:
            lines.append(f"      ... {gap:.1f}s pause ...")
        flag = f"   <- {retakes[s['id']]}" if s["id"] in retakes else ""
        lines.append(f"[S{s['id']:03d}] {s['start']:.2f}-{s['end']:.2f}  {s['text']}{flag}")
        prev_end = s["end"]
    (work / "transcript.md").write_text("\n".join(lines) + "\n", "utf-8")

    save_json(work / "analysis.json", {
        "source": src.name, "duration": info["duration"], "width": info["width"],
        "height": info["height"], "fps": info["fps"],
        "silences": [[round(a, 3), round(min(b, info["duration"]), 3)] for a, b in silences],
        "retake_flags": {f"S{k:03d}": v for k, v in retakes.items()}})

    draft = {
        "source": src.name, "output": "out/final.mp4",
        "resolution": [1920, 1080] if info["width"] >= info["height"] else [1080, 1920],
        "fps": 30, "font": "Arial", "accent": "#FFD400",
        "keep": keep,
        "captions": {"enabled": True, "words_per_chunk": 3, "uppercase": True},
        "graphics": [], "broll": [], "zooms": [],
        "music": {"file": None, "volume": 0.12, "duck": True},
    }
    save_json(work / "edl.draft.json", draft)
    if not (proj / "edl.json").exists():
        save_json(proj / "edl.json", draft)
        print(f"wrote {proj / 'edl.json'} (silence-cut draft)")
    print(f"wrote {work / 'transcript.md'}, analysis.json, edl.draft.json")
    print(f"{len(segs)} segments, {len(silences)} silences, {len(retakes)} flagged, "
          f"draft keeps {ts(kept)} of {ts(info['duration'])}")


# ---------------------------------------------------------------- 3. b-roll

def pexels_fetch(query: str, dest: Path, orientation: str) -> Path | None:
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        return None
    url = "https://api.pexels.com/videos/search?" + urllib.parse.urlencode(
        {"query": query, "per_page": 5, "orientation": orientation, "size": "medium"})
    req = urllib.request.Request(url, headers={"Authorization": key, "User-Agent": "vedit"})
    with urllib.request.urlopen(req, timeout=30) as r:
        vids = json.load(r).get("videos", [])
    for v in vids:
        files = [f for f in v["video_files"] if f.get("file_type") == "video/mp4"
                 and f.get("width") and max(f["width"], f["height"]) <= 1920]
        if not files:
            continue
        best = max(files, key=lambda f: f["width"] * f["height"])
        out = dest / f"pexels-{v['id']}.mp4"
        if not out.exists():
            req = urllib.request.Request(best["link"], headers={"User-Agent": "vedit"})
            with urllib.request.urlopen(req, timeout=120) as r, open(out, "wb") as f:
                shutil.copyfileobj(r, f)
        return out
    return None


def cmd_broll(proj: Path) -> None:
    edl_path = proj / "edl.json"
    edl = load_json(edl_path)
    folder = proj / "broll"
    folder.mkdir(exist_ok=True)
    local = sorted(p for p in folder.iterdir() if p.suffix.lower() in VIDEO_EXTS | {".jpg", ".png", ".jpeg"})
    w, h = edl.get("resolution", [1920, 1080])
    orient = "landscape" if w >= h else "portrait"
    missing = 0
    for item in edl.get("broll", []):
        if item.get("file") and (proj / item["file"]).exists():
            continue
        q = item.get("query", "")
        qwords = set(norm_words(q))
        match = next((p for p in local if qwords & set(norm_words(p.stem))), None)
        if not match and q:
            try:
                match = pexels_fetch(q, folder, orient)
            except Exception as e:  # network/API issues should not kill the run
                print(f"  pexels failed for '{q}': {e}")
        if match:
            item["file"] = match.relative_to(proj).as_posix()
            print(f"  {q!r} -> {item['file']}")
        else:
            missing += 1
            print(f"  {q!r} -> NOT FOUND (drop a file named like the query into broll/, "
                  f"or set PEXELS_API_KEY)")
    save_json(edl_path, edl)
    print(f"updated {edl_path}; {missing} b-roll item(s) still missing (they will be skipped)")


# ---------------------------------------------------------------- 4. render

class TimeMap:
    """Maps source-video time to output time through the keep list."""

    def __init__(self, keep: list[dict]):
        self.keep = sorted(((k["start"], k["end"]) for k in keep), key=lambda k: k[0])
        self.offsets, acc = [], 0.0
        for s, e in self.keep:
            self.offsets.append(acc)
            acc += e - s
        self.duration = acc

    def map(self, t: float, snap: bool = True) -> float | None:
        for (s, e), off in zip(self.keep, self.offsets):
            if s <= t <= e:
                return off + t - s
            if t < s:
                return off if snap else None
        return self.duration if snap else None


def ass_color(hex_rgb: str, alpha: int = 0) -> str:
    h = hex_rgb.lstrip("#")
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"&H{alpha:02X}{b}{g}{r}".upper()


def ass_time(t: float) -> str:
    t = max(t, 0)
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def ass_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("{", "(").replace("}", ")").replace("\n", "\\N")


def build_ass(edl: dict, tm: TimeMap, transcript: dict | None) -> str:
    W, H = edl.get("resolution", [1920, 1080])
    portrait = H > W
    font = edl.get("font", "Arial")
    accent = ass_color(edl.get("accent", "#FFD400"))
    white, black = "&H00FFFFFF", "&H00000000"
    box = "&H40000000"
    cap_size = round(H * (0.042 if portrait else 0.06))
    cap_margin = round(H * (0.28 if portrait else 0.10))
    styles = [
        # Name,Font,Size,Primary,Secondary,Outline,Back,Bold,Italic,U,S,ScX,ScY,Sp,Ang,Border,Outl,Shad,Align,ML,MR,MV,Enc
        f"Caption,{font},{cap_size},{white},{accent},{black},{black},-1,0,0,0,100,100,0,0,1,{max(3, cap_size // 14)},2,2,60,60,{cap_margin},1",
        f"Title,{font},{round(H * (0.06 if portrait else 0.085))},{white},{accent},{black},{black},-1,0,0,0,100,100,0,0,1,{round(H * 0.006)},3,5,80,80,0,1",
        f"Lower,{font},{round(H * 0.04)},{white},{accent},{box},{box},-1,0,0,0,100,100,0,0,3,{round(H * 0.012)},0,1,80,80,{round(H * 0.16)},1",
        f"LowerSub,{font},{round(H * 0.028)},{accent},{accent},{box},{box},0,0,0,0,100,100,0,0,3,{round(H * 0.01)},0,1,80,80,{round(H * 0.11)},1",
        f"Callout,{font},{round(H * 0.045)},{black},{accent},{accent},{accent},-1,0,0,0,100,100,0,0,3,{round(H * 0.014)},0,8,80,80,{round(H * 0.08)},1",
    ]
    lines = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}",
             "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
             "[V4+ Styles]",
             "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, "
             "BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, "
             "BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding"]
    lines += [f"Style: {s}" for s in styles]
    lines += ["", "[Events]",
              "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]

    def ev(layer, start, end, style, text):
        lines.append(f"Dialogue: {layer},{ass_time(start)},{ass_time(end)},{style},,0,0,0,,{text}")

    # motion graphics (times are SOURCE seconds; durations are output seconds)
    busy: list[tuple[float, float]] = []
    for g in edl.get("graphics", []):
        start = tm.map(float(g["at"]))
        dur = float(g.get("duration", 3))
        end = min(start + dur, tm.duration)
        text = ass_escape(g.get("text", ""))
        kind = g.get("type", "title")
        if kind == "title":
            ev(5, start, end, "Title",
               r"{\fad(200,250)\fscx70\fscy70\t(0,280,\fscx100\fscy100)}" + text)
            busy.append((start, end))
        elif kind == "lower_third":
            y1, y2 = H - round(H * 0.16), H - round(H * 0.11)
            ev(5, start, end, "Lower",
               rf"{{\fad(150,250)\an1\move(-{W // 2},{y1},80,{y1},0,350)}}" + text)
            if g.get("sub"):
                ev(5, start + 0.15, end, "LowerSub",
                   rf"{{\fad(150,250)\an1\move(-{W // 2},{y2},80,{y2},0,350)}}" + ass_escape(g["sub"]))
        elif kind == "callout":
            ev(5, start, end, "Callout",
               r"{\fad(120,200)\frz-2\fscy0\t(0,180,\fscy100)}" + text)
        elif kind == "list":
            items = g.get("items", [])
            step = min(0.6, dur / max(len(items) + 1, 1))
            for i, it in enumerate(items):
                y = round(H * 0.3) + i * round(H * 0.09)
                ev(5, start + i * step, end, "Title",
                   rf"{{\fad(150,250)\an4\fs{round(H * 0.05)}\move({W + 50},{y},{round(W * 0.08)},{y},0,300)}}"
                   rf"{{\c{accent}}}{i + 1}.{{\c{white}}} " + ass_escape(it))
            busy.append((start, end))

    # word-by-word captions, hidden while a full-screen title/list is up
    cap = edl.get("captions", {})
    if cap.get("enabled") and transcript:
        words = []
        for s in transcript["segments"]:
            for w in s["words"]:
                mid = (w["start"] + w["end"]) / 2
                if tm.map(mid, snap=False) is None:
                    continue
                a = tm.map(w["start"]) or 0.0
                b = tm.map(w["end"]) or a
                if b - a > 0.02:
                    words.append({"w": w["w"], "start": a, "end": b})
        n = max(1, int(cap.get("words_per_chunk", 3)))
        upper = cap.get("uppercase", True)
        cap_events: list[list] = []
        i = 0
        while i < len(words):
            chunk = [words[i]]
            while (len(chunk) < n and i + len(chunk) < len(words)
                   and words[i + len(chunk)]["start"] - chunk[-1]["end"] < 0.6
                   and not chunk[-1]["w"].endswith((".", "?", "!"))):
                chunk.append(words[i + len(chunk)])
            for j, w in enumerate(chunk):
                st = w["start"]
                en = chunk[j + 1]["start"] if j + 1 < len(chunk) else w["end"] + 0.15
                if any(bs <= st < be for bs, be in busy):
                    continue
                parts = []
                for k, o in enumerate(chunk):
                    t = ass_escape(o["w"].upper() if upper else o["w"])
                    parts.append(rf"{{\c{accent}\fscx112\fscy112}}{t}{{\r}}" if k == j else t)
                pop = r"{\fscx92\fscy92\t(0,90,\fscx100\fscy100)}" if j == 0 else ""
                cap_events.append([st, en, pop + " ".join(parts)])
            i += len(chunk)
        # one caption on screen at a time: clip each event at the next one's start
        for k, (st, en, text) in enumerate(cap_events):
            if k + 1 < len(cap_events):
                en = min(en, cap_events[k + 1][0])
            if en - st > 0.01:
                ev(1, st, en, "Caption", text)
    return "\n".join(lines) + "\n"


def cover(w: int, h: int) -> str:
    return (f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1")


def cmd_render(proj: Path, preview: bool) -> None:
    need("ffmpeg")
    edl = load_json(proj / "edl.json")
    work = proj / "work"
    work.mkdir(exist_ok=True)
    src = proj / edl["source"]
    info = probe(src)
    keep = [k for k in edl["keep"] if k["end"] > k["start"]]
    if not keep:
        sys.exit("edl.json has an empty keep list")
    tm = TimeMap(keep)
    W, H = edl.get("resolution", [1920, 1080])
    if preview:
        W, H = W // 2 // 2 * 2, H // 2 // 2 * 2
        edl = {**edl, "resolution": [W, H]}
    fps = edl.get("fps", 30)
    enc = (["-c:v", "libx264", "-preset", "ultrafast", "-crf", "28"] if preview
           else ["-c:v", "libx264", "-preset", "medium", "-crf", "18"])

    # --- pass 1: cuts (+ punch-in zooms), normalised to target res/fps
    zooms = edl.get("zooms", [])
    a_in = "0:a" if info["has_audio"] else "1:a"  # silent track for audio-less sources
    fc = []
    for i, k in enumerate(keep):
        s, e = k["start"], k["end"]
        z = next((float(zz.get("scale", 1.15)) for zz in zooms
                  if s <= float(zz["at"]) < e or float(zz["at"]) <= s < float(zz.get("until", zz["at"]))), 1.0)
        zoom = (f",scale=iw*{z}:ih*{z},crop=iw/{z}:ih/{z}" if z > 1.0 else "")
        fc.append(f"[0:v]trim=start={s}:end={e},setpts=PTS-STARTPTS{zoom},{cover(W, H)},fps={fps}[v{i}]")
        fc.append(f"[{a_in}]atrim=start={s}:end={e},asetpts=PTS-STARTPTS,"
                  f"afade=t=in:d=0.015,afade=t=out:st={max(e - s - 0.015, 0):.3f}:d=0.015[a{i}]")
    fc.append("".join(f"[v{i}][a{i}]" for i in range(len(keep)))
              + f"concat=n={len(keep)}:v=1:a=1[vc][ac]")
    script = work / "cut.filter"
    script.write_text(";\n".join(fc), "utf-8")
    silent = [] if info["has_audio"] else ["-f", "lavfi", "-t", f"{info['duration']:.3f}",
                                           "-i", "anullsrc=r=48000:cl=stereo"]
    cut = work / "cut.mkv"
    print(f"pass 1/2: cutting {len(keep)} segments -> {ts(tm.duration)}")
    run(["ffmpeg", "-y", "-i", src, *silent, "-filter_complex_script", script,
         "-map", "[vc]", "-map", "[ac]",
         "-c:v", "libx264", "-preset", "ultrafast" if preview else "veryfast", "-crf", "16",
         "-c:a", "pcm_s16le", cut])

    # --- pass 2: b-roll, graphics/captions, music, loudness
    tr_path = work / "transcript.json"
    transcript = load_json(tr_path) if tr_path.exists() else None
    (work / "graphics.ass").write_text(build_ass(edl, tm, transcript), "utf-8")

    inputs: list = ["-i", cut.name]
    fc = ["[0:v]null[base0]"]
    base, n_in = "base0", 1
    for item in edl.get("broll", []):
        f = item.get("file")
        if not f or not (proj / f).exists():
            continue
        at = tm.map(float(item["at"]))
        dur = min(float(item.get("duration", 3)), tm.duration - at)
        if dur <= 0.3:
            continue
        p = (proj / f).resolve()
        if p.suffix.lower() in {".jpg", ".jpeg", ".png"}:
            inputs += ["-loop", "1", "-t", f"{dur:.3f}", "-i", str(p)]
            kb = f",zoompan=z='min(zoom+0.0008,1.12)':d=1:s={W}x{H}:fps={fps}"  # Ken Burns
        else:
            inputs += ["-i", str(p)]
            kb = ""
        ss = float(item.get("clip_start", 0))
        fc.append(f"[{n_in}:v]trim=start={ss}:duration={dur:.3f},setpts=PTS-STARTPTS,"
                  f"{cover(W, H)}{kb},fps={fps},format=yuva420p,"
                  f"fade=t=in:st=0:d=0.2:alpha=1,fade=t=out:st={max(dur - 0.2, 0):.3f}:d=0.2:alpha=1,"
                  f"setpts=PTS+{at:.3f}/TB[b{n_in}]")
        fc.append(f"[{base}][b{n_in}]overlay=eof_action=pass:"
                  f"enable='between(t,{at:.3f},{at + dur:.3f})'[base{n_in}]")
        base, n_in = f"base{n_in}", n_in + 1
    fc.append(f"[{base}]ass=graphics.ass,format=yuv420p[vout]")

    music = edl.get("music") or {}
    mfile = music.get("file")
    D = tm.duration
    if mfile and (proj / mfile).exists():
        inputs += ["-stream_loop", "-1", "-i", str((proj / mfile).resolve())]
        vol = float(music.get("volume", 0.12))
        fc.append(f"[{n_in}:a]atrim=0:{D:.3f},volume={vol},"
                  f"afade=t=in:d=1,afade=t=out:st={max(D - 2, 0):.3f}:d=2,aformat=channel_layouts=stereo[mus]")
        fc.append("[0:a]aformat=channel_layouts=stereo,asplit=2[voice][key]")
        if music.get("duck", True):
            fc.append("[mus][key]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=350[musd]")
        else:
            fc.append("[key]anullsink;[mus]anull[musd]")
        fc.append("[voice][musd]amix=inputs=2:duration=first:normalize=0[mix]")
        amix = "mix"
    else:
        fc.append("[0:a]aformat=channel_layouts=stereo[mix]")
        amix = "mix"
    fc.append(f"[{amix}]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]")
    (work / "compose.filter").write_text(";\n".join(fc), "utf-8")

    out = (proj / edl.get("output", "out/final.mp4"))
    if preview:
        out = out.with_name(out.stem + ".preview.mp4")
    out.parent.mkdir(parents=True, exist_ok=True)
    print(f"pass 2/2: b-roll, graphics, captions, audio -> {out.relative_to(proj)}")
    # cwd=work so the ass filter gets a plain relative path (avoids Windows C:\ escaping)
    run(["ffmpeg", "-y", *inputs, "-filter_complex_script", "compose.filter",
         "-map", "[vout]", "-map", "[aout]", *enc, "-r", str(fps),
         "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", f"{D:.3f}",
         str(out.resolve())], cwd=work)
    o = probe(out)
    print(f"done: {out} ({ts(o['duration'])}, {o['width']}x{o['height']}) "
          f"- cut {ts(info['duration'] - D)} from {ts(info['duration'])}")


# ---------------------------------------------------------------- CLI

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name, hlp in [("prep", "transcribe + analyze"), ("transcribe", "whisper transcript"),
                      ("analyze", "silences, retakes, transcript.md, draft EDL"),
                      ("broll", "resolve b-roll files for edl.json"),
                      ("render", "render edl.json to video")]:
        p = sub.add_parser(name, help=hlp)
        p.add_argument("project", type=Path, help="project folder containing the raw video")
        if name in ("prep", "transcribe"):
            p.add_argument("--model", default="small",
                           help="whisper model: tiny|base|small|medium|large-v3 (default small)")
            p.add_argument("--language", default=None, help="e.g. en (default: auto-detect)")
        if name in ("prep", "analyze"):
            p.add_argument("--noise-db", type=float, default=-35)
            p.add_argument("--min-silence", type=float, default=0.45)
        if name == "render":
            p.add_argument("--preview", action="store_true", help="half-res fast render")
    a = ap.parse_args()
    proj = a.project.resolve()
    if not proj.is_dir():
        sys.exit(f"{proj} is not a folder")
    if a.cmd in ("prep", "transcribe"):
        cmd_transcribe(proj, a.model, a.language)
    if a.cmd in ("prep", "analyze"):
        cmd_analyze(proj, a.noise_db, a.min_silence)
    if a.cmd == "broll":
        cmd_broll(proj)
    if a.cmd == "render":
        cmd_render(proj, a.preview)


if __name__ == "__main__":
    main()
