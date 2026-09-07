# Public release assessment â€” 7 September 2026

Current verdict: a deployed development preview, not yet signed off as a finished release. GitHub Pages and Namecheap DNS are configured; HTTPS certificate issuance is pending.

## Implemented and checked

- Static browser build, two chapters, load/briefing screens, music toggle, pause/restart and outcome screens.
- Keyboard, controller mapping and touch controls; real phones/controllers remain unverified.
- Road boundary collision now checks the car footprint across the route and junctions. Added repeated-turn, boost/reverse and junction tests.
- Passive mouse position no longer steers the car. Right-button hold deliberately engages mouse steering; release recentres it. Keyboard priority and controller dead-zone tests added.
- Before/after Batmobile visual comparison: verification/film-comparison.html.
- Model attributions now include the Batmobile and Batwing metadata licences in public/credits.html.

## Release gates I would require

1. Performance: profile the GTX 1650 and actual phones, measure sustained frame times through both chapters and optimize the slow cases. Target stable 60 FPS on the intended desktop tier and at least 30 FPS on supported phones, with an explicit minimum-device policy. Current Intel HD 4600 results fall short. No 60 FPS claim is justified yet.
2. Gameplay: play both missions end to end in real time; verify all junctions, curb recovery, enemy timing, win/loss, retry and no soft locks. Active wall-clock mission timing is now separate from capped physics. Ground movement uses small simulation steps; stalls beyond 250 ms limit physics catch-up.
3. Compatibility: real Chrome/Edge/Firefox/Safari, iPhone/iPad Safari and Android Chrome; physical controller; portrait/landscape rotation, resize, focus loss, audio activation, loading failures and slow connections. Emulation does not replace these checks.
4. Rights: review Batman/DC/Warner branding and vehicle-design use before public launch. The Batwing identifies CC BY 4.0 and the replacement Batmobile is CC BY-NC-SA 3.0; these do not establish that the uploader can grant all underlying franchise rights. Predator is CC BY-NC-SA 4.0; any commercial plan requires an appropriate replacement or permission. Keep full credits and modification notices. A fan-project disclaimer is not a substitute for permission.
5. Hosting: deploy a versioned preview to a static HTTPS host, test the actual domain/subfolder paths, MIME types, cache rules and GLB downloads, then connect DNS. Preserve existing email MX/TXT records. Keep a rollback build. Do not expose the local Vite development server as the public site.
6. Launch basics: verify instructions, loading/retry messages, favicon/social preview, readable UI, privacy disclosure if analytics/cookies are introduced, and one final production smoke test. Current game needs no accounts, payments or backend.

## Hosting state

Repository: Crawford1982/batman. Free game hosted on GitHub Pages at batman1989.co.uk through Namecheap BasicDNS. Public HTTP smoke test passed; HTTPS certificate pending. No accounts, payments or analytics added. See GITHUB-PAGES.md for exact settings.

## Source references

- Batmobile design reference: https://automuseum.org/batmobile-exhibit/
- Creator licences: https://creativecommons.org/licenses/by/4.0/
- Predator licence: https://creativecommons.org/licenses/by-nc-sa/4.0/ and https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode
- Example static custom-domain workflow: https://developers.cloudflare.com/pages/configuration/custom-domains/

These are release criteria, not a claim that all requirements have already passed.


## Replacement car

Downloaded and integrated visnik's 89 Batmobile from BlendSwap. It has a more faithful low front turbine, long fenders and sculpted fins. Browser PBR conversion, four wheel pivots, geometry optimization (116,146 triangles), licence notice and attribution are included. Collision half-width increased to 2.1 for the rear wheels. Road and full ground browser regressions passed. Visual inspection: verification/car-visnik.png. This is a closer fan model, not a claim of exact film-prop geometry.
