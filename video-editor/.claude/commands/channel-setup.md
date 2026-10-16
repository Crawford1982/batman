---
description: Build CHANNEL.md, the channel's baseline profile that every other command reads (run once, refresh monthly)
argument-hint: <channel name or URL>
---

Build or refresh `CHANNEL.md` for: $ARGUMENTS

Use vidIQ MCP tools if they're available (any tool whose name contains `vidiq`). Otherwise ask the user to paste their YouTube Studio overview and top videos. Never invent numbers; mark anything unknown as `unknown`.

1. **Baseline**: subscribers, total videos, upload cadence, and typical views per video at 7 and 28 days (use the median, not the mean). Also typical CTR, average view duration and like-to-view ratio, if available.
2. **What already works**: top 10 videos by views *relative to the channel's median* (outliers). For each, find the shared pattern in topic, title framing and thumbnail. Do the same for the bottom 5.
3. **Audience (revealed preference)**: what this audience also watches, i.e. adjacent channels and topics with outlier videos. These are the demand-stacking candidates (films, characters, creators, events).
4. **Persona and proof**: who the channel is for in one line, and what counts as *proof* for this creator (on-screen results, build hours, failure count, credentials).
5. **Goal**: ask the user what success means for this channel right now (subs, watch hours for monetisation, shop traffic, community) and record it, since /post-mortem judges against it.
6. **Reference channels**: ask the user for channels they'd like to be like. For each one, find its outlier videos and explain *why* they work (topic, framing, thumbnail, format, persona). Then sort each lesson into **transferable** (works at this channel's size and budget) or **not transferable** (depends on an existing audience, budget, team or fame). Suggest 2–3 *small* channels in the niche that broke out recently, since they're the closest copy of the situation this channel is in.
7. **Shorts vs long-form**: compare how each performs, if there are both.

Write all of this to `CHANNEL.md` in this folder, with a `Last updated: <date>` line. End by giving the user the three strongest opportunities you see, with evidence.
