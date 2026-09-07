# Public release assessment — 7 September 2026

Current verdict: suitable for local review and controlled playtesting after the current fixes; not yet signed off for a broad public release. A bought domain supplies the address, not hosting or intellectual-property permission.

## Implemented and checked

- Static browser build, two chapters, load/briefing screens, music toggle, pause/restart and outcome screens.
- Keyboard, controller mapping and touch controls; real phones/controllers remain unverified.
- Road boundary collision now checks the car footprint across the route and junctions. Added repeated-turn, boost/reverse and junction tests.
- Passive mouse position no longer steers the car. Right-button hold deliberately engages mouse steering; release recentres it. Keyboard priority and controller dead-zone tests added.
- Before/after Batmobile visual comparison: verification/film-comparison.html.
- Model attributions now include the Batmobile and Batwing metadata licences in public/credits.html.

## Release gates I would require

1. Performance: profile the GTX 1650 and actual phones, measure sustained frame times through both chapters and optimize the slow cases. Target stable 60 FPS on the intended desktop tier and at least 30 FPS on supported phones, with an explicit minimum-device policy. Current Intel HD 4600 results fall short. No 60 FPS claim is justified yet.
2. Gameplay: play both missions end to end in real time; verify all junctions, curb recovery, enemy timing, win/loss, retry and no soft locks. Check timer consistency at low FPS: physics currently caps simulation delta, so wall-clock mission duration can stretch on slow hardware.
3. Compatibility: real Chrome/Edge/Firefox/Safari, iPhone/iPad Safari and Android Chrome; physical controller; portrait/landscape rotation, resize, focus loss, audio activation, loading failures and slow connections. Emulation does not replace these checks.
4. Rights: review Batman/DC/Warner branding and vehicle-design use before public launch. Supplied car and aircraft files identify CC BY 4.0 creator licences; these do not establish that the uploader can grant all underlying franchise rights. Predator is CC BY-NC-SA 4.0; any commercial plan requires an appropriate replacement or permission. Keep full credits and modification notices. A fan-project disclaimer is not a substitute for permission.
5. Hosting: deploy a versioned preview to a static HTTPS host, test the actual domain/subfolder paths, MIME types, cache rules and GLB downloads, then connect DNS. Preserve existing email MX/TXT records. Keep a rollback build. Do not expose the local Vite development server as the public site.
6. Launch basics: verify instructions, loading/retry messages, favicon/social preview, readable UI, privacy disclosure if analytics/cookies are introduced, and one final production smoke test. Current game needs no accounts, payments or backend.

## Information needed from the owner

- Exact domain and registrar/DNS provider.
- Existing hosting account, or agreement on a static host.
- Whether the game will be free without advertising, donations, sponsorship or payments; identify any commercial plan for the asset review.
- Intended audience/devices and acceptable minimum performance.

Use an authenticated provider session or scoped access when deployment is authorized; do not paste passwords into chat. No deployment or DNS mutation has been performed.

## Source references

- Batmobile design reference: https://automuseum.org/batmobile-exhibit/
- Creator licences: https://creativecommons.org/licenses/by/4.0/
- Predator licence: https://creativecommons.org/licenses/by-nc-sa/4.0/ and https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode
- Example static custom-domain workflow: https://developers.cloudflare.com/pages/configuration/custom-domains/

These are release criteria, not a claim that all requirements have already passed.


## Owner update: domain and hosting

The owner has bought batman1989.co.uk through Namecheap and intends a free GitHub Pages game. Local preparation is in .github/workflows/pages.yml, public/CNAME and GITHUB-PAGES.md. GitHub username/repository are still needed. No remote repository, DNS change or deployment has been performed. The current car is still rejected for film fidelity; replacement is an unresolved release gate. See verification/car-candidates.html. The visnik candidate appears promising from its preview, but its download requires sign-in and it has not been integrated or validated.
