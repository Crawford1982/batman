# Theatre block
Source: Quaternius Downtown City MegaKit Standard, CC0, downloaded 13 September 2026.
https://quaternius.com/packs/downtowncitymegakit.html
See LICENSE.txt. Free edition only; no paid shaders or source projects.

Selected Building_Medium_2_001 and Building_Small_1. Original combined 43,956 triangles; remove inaccessible interior walls/floors, weld/simplify conservatively, join and deduplicate. Export 26,734 template triangles, nine materials, sixteen textures, 4,774,940 bytes. Four copies of each template use instancing. Colours and window emission adjusted at runtime; rooftop snow added in game. No game logic or car collision envelope changed.

Texture cap 512px, ORM/interior maps 256px. Upper bound for sixteen RGBA8 512px maps including mipmaps is 21.4 MiB (actual less due to 256px maps). This is GPU memory, not compressed file size.

Rebuild: extract the free Standard archive outside the repository to ../assets-source/downtown-standard; run python scripts/prepare-theatre.py (Pillow), then node scripts/build-theatre-kit.mjs. Committed GLB means normal npm builds do not need source archive or Pillow.

Fallback: append ?legacyCity=1 to retain the original block. Failed downloads retain it automatically. Only section 1 / 140–280 metres of the route is replaced. Further environment work is tracked in VISUAL-BACKLOG.md.
