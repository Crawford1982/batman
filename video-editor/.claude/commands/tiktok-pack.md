---
description: Turn a project's vertical render into a ready-to-post TikTok package (caption, hook text, hashtags, cover, schedule)
argument-hint: <project-name>
---

Prepare `projects/$1` for TikTok. Read `CHANNEL.md`, `brief.md` and `work/transcript.md`. If the `engineeringchaos-tiktok-strategy` skill is available, use its hook library and search terms.

1. **Video**: make sure a vertical render exists (`resolution: [1080, 1920]`). If not, write the vertical variant of edl.json to `edl.tiktok.json`, then render it to `out/tiktok.mp4`. TikTok favours a hook in the first second, so check that the kept transcript's first line *is* the hook, and propose a cold open if it isn't.
2. **On-screen hook text** for the first 2 s (max ~6 words). Add it as a `title` graphic at the first kept timestamp if the user agrees.
3. **Caption**: 2–3 options, with TikTok search terms written naturally into the caption (TikTok is a search engine too). End with one question that invites comments.
4. **Hashtags**: 3–5, mixing broad and niche. No banned or spammy tags.
5. **Cover frame**: suggest the timestamp of the most striking frame, plus cover text.
6. **When to post**: from the user's TikTok analytics if they paste or export it (TikTok Studio → Analytics → Followers → most active times); otherwise say it's unknown and suggest testing.
7. Write `## TikTok` into brief.md with all of the above, and tell the user to upload `out/tiktok.mp4` in TikTok Studio (web) and paste the caption in. Use TikTok Studio's scheduler if they want it to go live later.

Never upload a video that carries a watermark from another platform.
