# Operation Silent Bell â€” verification

6 September 2026. Production build and 9 unit tests passed. Edge headless browser scenarios passed with no page runtime errors.

Verified: three-shot cinematic briefing and skip; desktop and mobile layouts; flight and pause/resume; standard controller simulation; virtual-stick and fire input; cannon/missile target behavior; actual missile destruction of a relay; bomber impact reducing city integrity; city-collapse failure; evacuation completion with relays disabled; restart resetting mission state; smooth boost release; collision recovery; bridge underpass bounds; landmark exclusion zones.

Latest production samples: desktop approximately 25 FPS at 1440x900; mobile emulation approximately 29 FPS at 844x390. These are short automated samples, not sustained physical-device measurements. GPU diagnostic reports ANGLE Intel HD Graphics 4600 / D3D11. GTX 1650 performance remains unverified. No Windows graphics preferences were changed.

The 20-minute completion path was accelerated for verification; a full real-time mission was not played. No physical phone or controller was available. Screenshot artifacts are in this directory. The intro is real-time 3D with music and captioned radio dialogue, not a downloaded or recorded film.

## 7 September â€” Chapter II: The Final Mile

Production build: passed. Unit tests: 12/12. Ground browser scenarios: passed with no page/console errors, including asset load, keyboard acceleration, touch gas, EMP, pause/resume, defeat/restart, all route checkpoints, victory, flight-to-ground continuation and return to the original flight chapter. Original flight browser regression: passed. The driving movement assertion now waits for observed movement rather than relying on a short wall-clock delay on this slower GPU.

Ground screenshots: ground-briefing.png, ground-driving.png, ground-mobile-briefing.png, ground-mobile.png. Roughly 525k rendered triangles in the ground scene; short headless samples around 23 FPS. Physical controller/phone and dedicated-GPU performance still need verification. New model is loaded lazily on chapter selection; the original file is untouched. The website ZIP contains both levels. Development priorities are maintained in BACKLOG.md.


## 7 September â€” Chapter II visual upgrade

Production build passed. Twelve unit tests passed. Original flight regression passed with no runtime errors. Production-preview ground tests passed: optimized car/drone loading, keyboard motion, touch gas, EMP, pause/resume, defeat/restart, checkpoint victory, chapter transition and flight return. Production visual tests passed: both imported pursuers present, all six route legs sampled every five metres against new faÃ§ade colliders with zero obstructions, EMP disruption and no console/page errors. Gameplay screenshots were inspected for Midtown, railway, Old Gotham, cathedral, EMP and drone close-up; hard light-pool edges, mine draw-call overhead, drone orientation and EMP arc continuity were corrected during review.

Assets: Predator 110,207 -> 20,412 triangles / 1,818,344 bytes. Batmobile 356,908 -> 119,594 triangles / 2,879,408 bytes. Original files preserved. Latest sampled ground scene approximately 312kâ€“349k triangles, compared with roughly 525k before the visual pass. Added street pieces are merged by material in 22 cells and distance-culled; effects use fixed particle budgets.

The FPS counter previously used capped simulation delta and therefore overstated low frame rates. It now uses wall-clock frame delta. Production headless samples at 1440x900 reported approximately 14â€“16 FPS during the screenshot traversal on Intel HD Graphics 4600. Loading/compilation and simultaneous desktop rendering affect short samples; these are not sustained GPU benchmarks. Previous 23 FPS ground figures are not directly comparable because of the counter correction. A reliable 60 FPS has NOT been achieved on this integrated-GPU path. GTX 1650 and physical phone/controller checks remain outstanding. Performance is the first ranked next improvement.

Final images: ground-briefing.png, ground-driving.png, ground-mobile.png, visual-midtown.png, visual-railway.png, visual-old-gotham.png, visual-cathedral.png, visual-emp.png, visual-drone.png. The route traversal uses controlled positioning to inspect multiple real rendered locations; the six-minute mission was not played end to end in real time.


## Road containment, steering drift and film presentation corrections

15 unit tests passed, including 9,600 simulation frames of steering/boost/reverse containment, a passable left-hand junction, shortcut rejection, neutral cursor and controller drift checks. Road browser regression passed: cursor parked left + W caused exactly zero lateral movement/yaw; explicit right-button mouse steering worked; release neutralized it; a sustained boosted attempt to cross a curb stopped at x=13.337 with the full car footprint inside the 18-metre road half-width; reset cleared steering. No console/page errors.

Ground browser scenarios also passed after the changes, including touch driving, EMP, pause/restart, victory and chapter transitions. Before/after portraits were captured and inspected; the comparison page's local and external reference images loaded successfully. The reference is a museum photograph, not a film frame. Material/camera/exhaust changes retain the supplied geometry; exact film fidelity is not claimed. Original flight regression was rerun following shared mouse-handler changes.

The final website archive includes corrected controls, road containment and full three-model credits. Public deployment/DNS was not performed. See RELEASE-READINESS.md for remaining release blockers, including performance, physical-device testing, real-time playthroughs and rights review.

## Replacement asset and live deployment — 7 September 2026

visnik CC BY-NC-SA 3.0 Batmobile integrated, 116,146 triangles. Four animated wheel assemblies. All 15 unit tests, road-controls.mjs and ground.mjs passed. Production build and GitHub Pages workflow 34151888932 succeeded. live-domain.mjs loaded http://batman1989.co.uk with both models, confirmed Batmobile_body and four wheel assemblies, zero page/asset errors. HTTPS certificate pending; no 60 FPS or physical-device claim.

## Driving and route polish

16 unit checks passed, including 10 FPS versus 60 FPS driving distance and wall-clock elapsed time. Flight, ground, road-controls and route-clearance browser checks passed. Theatre and railway camera views inspected. Sampled ground views submitted approximately 172k to 220k triangles after spatial culling; these are not sustained FPS benchmarks. Physical phones/controllers remain unverified.


## Shorter mission and mobile driving guidance — 7 September 2026

20 unit tests pass, covering finite final raids, early victory, ten-minute failure, raid throttling, nearby recovery without free health/time/progress, and junction cues before and after checkpoint crossing. Production build passes. Flight browser regression passes including mission victory, collision, combat, pause, loss and restart. Ground browser regression passes including chapter transitions and simultaneous CDP touch steering + gas, touch cancellation, visible mobile map and turn guidance. Road-control regression passes for neutral mouse steering, deliberate steering and full-body curb containment. Both mobile landscape screenshots inspected. These are browser emulation checks; physical phones/controllers and sustained device performance remain unverified. No new asset downloads or voice generation in this focused pass.

Published game commit 7d4504a via successful GitHub Pages run 34157594144. Live-domain check confirmed updated ten-minute manual text, replacement car and four wheels, with zero page/asset errors. HTTPS certificate remains pending.


## Target feedback and junction guidance — 8 September 2026

Added target type/range/armour, a brief reticle flash and quiet rate-limited confirmation sound on actual weapon hits. Added merged gold road arrows before junctions, retained briefly after checkpoint crossing. Controls and physics unchanged. Twenty unit tests and production build passed. Flight and ground browser regressions passed, including touch controls. feedback.mjs verified actual cannon damage updates armour and reticle, target loss hides armour, and nearby junction guidance remains visible after crossing. Both feature screenshots inspected. Browser-emulated performance samples are not physical-device benchmarks; user reports both chapters felt good on their phone on 7 September.

Published 77f9140 through successful Pages run 34223627187. feedback.mjs also passes against the public domain after explicitly advancing past the initial cannon cooldown in its setup. Zero page errors.


## Three-character briefing voices — 8 September 2026

Three stock-voice recordings generated through vidIQ with explicit authorization for 42 credits total: Daniel as Alfred, Bill as Gordon, Brian as Batman. No further generation calls. MP3 assets total 334,916 bytes and decode to 6.72, 6.88 and 7.12 seconds, each inside its nine-second scene. Original matching captions; mild high-pass radio filtering and music ducking. Skipping, muting, menu exit and restarting cancel playback and pending downloads. Voice assets are served statically; no runtime generation service or keys.

Twenty unit tests and production build passed. Full flight browser regression passed, including mobile controls. voices.mjs passed in desktop and mobile emulation: all three decoded files and character transitions, music duck/restore, skip, mute, and cancellation before a delayed download resolves. No page errors. Actual-phone listening has not yet been verified.


## Interceptor runs and bomber escorts — 8 September 2026

Existing fighters now approach, display a 1.6-second attack warning, fire once at a committed predicted position, pass through and bank away before re-engaging. Bomber spawns recruit an existing fighter as escort; formation travel is bounded and does not teleport aircraft or increase fighter counts. Escorts intercept approaching players and detach if a bomber is destroyed or impacts a shelter. Models and mobile controls remain unchanged.

22 unit tests pass, including warning-before-fire, fixed aim during evasion, finite attack/breakaway cycle and formation/detachment. Full flight regression and dedicated enemy-ai.mjs desktop/mobile browser checks pass. Mobile warning screenshot inspected. Production build passes. The suggested Blend Swap 17286 historical aircraft was reviewed but not downloaded for this rogue-drone fleet. No paid assets or generation used.

Published 122c03c via successful Pages run 34229998961. HTTPS desktop/mobile enemy checks passed; the live test allows 60 seconds for initial model loading after a 30-second initial-load timeout. Production bundle and Batwing model both return HTTP 200.


## SEO package — 8 September 2026

Added descriptive search metadata, HTTPS canonical URLs, Open Graph/Twitter large-image cards, a 1200x630 actual-game JPEG, truthful VideoGame JSON-LD, static linked about/controls page, robots and sitemap. Corrected outdated twenty-minute menu copy and adjusted medium-height menus so settings remain visible. Keyword mapping and Search Console next steps documented in SEO-PACKAGE.md; supplied volumes not independently verified. No Search Console submission, rankings or rich-result eligibility claimed.

seo.mjs passes for metadata/schema parsing, crawlable menu link, image dimensions/loading, mobile about-page overflow, no-JavaScript content and fallback, robots/sitemap availability. About page and share image visually inspected. Production build passes; game physics/combat unchanged.


## Analytics preparation — 8 September 2026

Prepared optional GA4 basic-consent integration, privacy page, safe chapter start/end events and channel-specific traffic plan. Measurement ID intentionally empty pending the owner's existing ID or authenticated account setup. Not activated or deployed. Google Analytics browser is at sign-in; Search Console remains unverified.

analytics.mjs passed with all external requests intercepted: no Google tag before consent or after decline, remembered choice, accepted initialization, sanitized event fields, withdrawal/cookie removal, mobile fit and verification-query exclusion. No real Google Analytics collection was sent by tests. Production build passed. No social posts or paid promotions performed.
