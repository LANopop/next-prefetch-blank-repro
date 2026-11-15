// Counts navigations where #content shows no text at all (no page, no loading
// fallback) for at least one animation frame after the URL changed.
//
//   npm run build && npm start      (in another terminal)
//   node scripts/probe.mjs [latencyMs=400] [runs=10]
//   HOVER_WAITS=0,250,400,600,800 node scripts/probe.mjs   (ms between hover and click)
//
// CHROME=/path/to/chrome overrides the browser Playwright launches.
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const latency = Number(process.argv[2] ?? 400);
const runs = Number(process.argv[3] ?? 10);

const hoverWaits = (process.env.HOVER_WAITS ?? "400,600").split(",").map(Number);
const variants = [
  { name: "no prefetch (programmatic el.click())", hoverMs: null, jsClick: true },
  { name: "hover, wait 2500 ms (prefetch done), click", hoverMs: 2500 },
  ...hoverWaits.map((ms) => ({ name: `hover, wait ${ms} ms, click`, hoverMs: ms })),
];

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);

for (const variant of variants) {
  let blankRuns = 0;
  let longest = 0;
  for (let i = 0; i < runs; i++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/items`, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      window.__frames = [];
      const tick = () => {
        const c = document.getElementById("content");
        window.__frames.push([performance.now(), location.pathname, c ? c.textContent.trim().length : -1]);
        requestAnimationFrame(tick);
      };
      tick();
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    const link = page.getByRole("link", { name: `Item ${(i % 3) + 1}` });
    if (variant.jsClick) {
      await link.evaluate((el) => el.click());
    } else {
      await link.hover();
      await page.waitForTimeout(variant.hoverMs);
      await link.click();
    }
    await page.waitForSelector("article h1", { timeout: latency * 10 + 5000 });
    await page.waitForTimeout(100);
    const frames = await page.evaluate(() => window.__frames);
    const start = frames.findIndex((f) => f[1] !== frames[0][1]);
    const blank = start < 0 ? [] : frames.slice(start).filter((f) => f[2] === 0);
    if (blank.length) {
      blankRuns++;
      longest = Math.max(longest, Math.round(blank.at(-1)[0] - blank[0][0]));
    }
    await context.close();
  }
  console.log(
    `${variant.name}: blank in ${blankRuns}/${runs} runs` +
      (blankRuns ? ` (longest ~${longest} ms)` : ""),
  );
}

await browser.close();
