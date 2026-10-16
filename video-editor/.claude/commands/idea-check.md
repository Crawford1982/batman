---
description: Stage 1 - check a video idea for real, current demand (floor/ceiling) before filming
argument-hint: <project-name> <idea in plain words>
---

Follow PLAYBOOK.md stage 1 for this idea: $ARGUMENTS
Project folder: `projects/$1/` (create it if missing).

1. Turn the idea into 3–5 search phrases a viewer would actually type.
2. **Data source:** if vidIQ MCP tools are available (any tool whose name contains `vidiq`), use them first: keyword search volume and competition, top and outlier videos for each phrase, and trending outliers in the niche. Name the vidIQ tool used next to each number. Otherwise fall back to web search plus any numbers the user pastes. Keep vidIQ calls focused (about 10 per run) because they spend the user's credits.
3. Using that source, For each phrase, list the top ~5 relevant videos: title, channel size, views, age.
   - **Floor** = typical views of a decent video on it; **ceiling** = the best performers. Flag outliers that are huge relative to their channel's size (strong demand signal) and ones that look botted.
   - **Currency**: are videos from the last 6–12 months still pulling views?
4. Suggest 2–3 ways to **stack demand** to raise the ceiling (attach to a bigger character, film, creator or event the same audience already chooses), and say why each fits *this* audience.
5. Verdict: GO / RESHAPE / DROP, with one-line reasoning. If you couldn't find real numbers, say so; don't invent view counts.
6. Write or update `projects/$1/brief.md` with sections `## Idea`, `## Demand (floor/ceiling + sources)`, `## Verdict`. Keep any existing sections.
