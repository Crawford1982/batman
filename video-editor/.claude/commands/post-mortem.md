---
description: Stage 5 - read a published video's results and decide what to change next time
argument-hint: <project-name> (then paste Studio stats + a batch of comments)
---

Follow PLAYBOOK.md stage 5 for `projects/$1`. Read `brief.md` (and `edl.json` / `work/transcript.md` if present).

If vidIQ MCP tools are available, pull the video's stats, the channel's typical numbers and the comments yourself (the user gives the video URL or title), and only ask for what vidIQ can't provide, usually the retention-curve drop points from YouTube Studio. Otherwise ask the user to paste, if they haven't already: views and hours since publish, CTR, average view duration and %, the retention-curve drop points (timestamps), likes, subs gained, comment count, 20–50 comments, and their channel's typical numbers for comparison.

1. **Satisfaction signals**: positive comment-to-view ratio (classify the pasted comments as positive, neutral or negative and quote the telling ones), like-to-view, subs-per-view, compared with the channel's usual numbers.
2. **Where to look** (signals, not verdicts): for each weak metric, name the stage of the series system it points to (idea, packaging, hook, body, edit) and what to inspect. Map each retention drop to the transcript line at that timestamp. Remember that output timestamps differ from raw ones; use the edl `keep` list to map them back.
3. **Weakest link**: the one decision most likely to have sunk or capped this video, with evidence.
4. **Next video**: up to 3 concrete changes. If a lesson is about editing style, propose an exact addition to the "House style" section of CLAUDE.md, and add it if the user agrees.
5. Append `## Post-mortem (<date>)` to brief.md.
