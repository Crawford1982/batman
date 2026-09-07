import { chromium } from "@playwright/test";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage();
await p.goto("http://localhost:4173");
await p.waitForFunction(() => window.__batwing?.ready);
console.log(
  await p.evaluate(() => {
    const g = document.querySelector("#game").getContext("webgl2"),
      e = g.getExtension("WEBGL_debug_renderer_info");
    return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : "unavailable";
  }),
);
await b.close();
