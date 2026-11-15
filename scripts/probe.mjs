// Counts navigations where #content shows no text at all (no page, no
// loading.tsx fallback) for at least one animation frame after the URL
// changed. The fallback ("Loading item...") and the page both have text, so a
// frame only counts when the segment is genuinely empty.
//
//   npm run build && npm start        (in another terminal)
//   npm run probe                     (defaults below)
//   node scripts/probe.mjs [latencyMs=400] [runs=10]
//
// Env:
//   WAITS=0,300,400,600,700,800,1200  ms between the trigger and the click
//   MODE=hover     /items: hover the link (intent prefetch), wait, click
//   MODE=viewport  /default-link: plain <Link>; the page loads under
//                  throttling, the link prefetches on entering the viewport,
//                  wait, click (programmatic, so no hover prefetch)
//   MODE=none      /items: programmatic click, no prefetch at all
//   CHROME=/path/to/chrome   browser for Playwright to launch
//   BASE=http://127.0.0.1:3100
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const latency = Number(process.argv[2] ?? 400);
const runs = Number(process.argv[3] ?? 10);
const mode = process.env.MODE ?? "hover";
const waits = (process.env.WAITS ?? (mode === "none" ? "0" : "0,300,400,600,700,800,1200,2500"))
  .split(",")
  .map(Number);

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);

async function throttle(context, page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
}

function watchContent() {
  window.__frames = [];
  const tick = () => {
    const c = document.getElementById("content");
    window.__frames.push([performance.now(), location.pathname, c ? c.textContent.trim().length : -1]);
    requestAnimationFrame(tick);
  };
  tick();
}

console.log(`mode=${mode} latency=${latency}ms page=600ms`);
for (const wait of waits) {
  let blankRuns = 0;
  let longest = 0;
  for (let i = 0; i < runs; i++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const link = page.getByRole("link", { name: `Item ${(i % 3) + 1}` });
    if (mode === "viewport") {
      await throttle(context, page);
      await page.goto(`${BASE}/default-link`, { waitUntil: "load" });
      await page.evaluate(watchContent);
      await page.waitForTimeout(wait);
      await link.evaluate((el) => el.click());
    } else {
      await page.goto(`${BASE}/items`, { waitUntil: "networkidle" });
      await page.evaluate(watchContent);
      await throttle(context, page);
      if (mode === "none") {
        await page.waitForTimeout(wait);
        await link.evaluate((el) => el.click());
      } else {
        await link.hover();
        await page.waitForTimeout(wait);
        await link.click();
      }
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
    `  click ${wait} ms after ${mode === "viewport" ? "load" : mode === "none" ? "start" : "hover"}: ` +
      `blank in ${blankRuns}/${runs}` +
      (blankRuns ? ` (longest ~${longest} ms)` : ""),
  );
}

await browser.close();
