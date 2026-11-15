# Navigation during a pending prefetch: commit waits, then the segment renders empty

Next.js 16.4.3, App Router, production build (`next start`), default config.

`/items/[id]` has its own `loading.tsx`, and its page takes 600 ms
(`PAGE_DELAY_MS`). Two list pages link to it:

- `/items`: `<Link prefetch={false}>` plus `router.prefetch(href)` on pointer
  enter and focus (`app/intent-link.tsx`).
- `/default-link`: plain `<Link>` with its default prefetch.

When a navigation starts while a prefetch of the same route is still pending:

1. The navigation does not commit (old page, old URL) until the **prefetch**
   response arrives, even if the navigation's own response arrived first.
2. It then commits with the target segment **empty**: no page and no
   `loading.tsx` fallback. It stays empty until the page's data arrives, even
   after the navigation response has started streaming.

With no prefetch, or once the prefetch has finished, the fallback shows as
expected. `next dev` does not prefetch, so it does not show this.

## Run

```bash
npm install
npx playwright install chromium   # for the probe only
npm run build
npm start                         # http://127.0.0.1:3100
```

By hand: DevTools, Network, add a throttling profile with 400 ms latency. Go
to `/items`, hover "Item 1" for about half a second, then click. The URL
changes and the content area goes empty before "Item 1" appears; "Loading
item..." never shows.

Measured: in another terminal, `npm run probe` (see the header of
`scripts/probe.mjs` for `MODE` and `WAITS`). It throttles to 400 ms latency
with CDP, watches `<main id="content">` on every animation frame, and counts
navigations where it shows no text after the URL changed.

## Results (macOS, Chromium headless shell, 400 ms latency, 10 runs each)

`/items`, intent prefetch, click N ms after hover:

| Click after hover | Blank content area |
|---|---|
| 0 ms | 1/10 (one frame) |
| 300 ms | 3/10, up to ~80 ms |
| 400 ms | 10/10, up to ~175 ms |
| 600 ms | 10/10, up to ~370 ms |
| 700 ms | 10/10, up to ~475 ms |
| 800 / 1200 / 2500 ms | 0/10 |
| no prefetch (programmatic click) | 0/10 |

`/default-link`, plain `<Link>`, click N ms after the page loaded (programmatic
click, so only the viewport prefetch is involved):

| Click after load | Blank content area |
|---|---|
| 0 ms | 0/10 |
| 200 ms | 3/10, up to ~25 ms |
| 350 ms | 6/10, up to ~185 ms |
| 550 ms | 10/10, up to ~375 ms |
| 800 / 1500 ms | 0/10 |

Timeline (ms from hover, typical of 5 runs each):

| Case | Prefetch responses | Navigation response | Content area |
|---|---|---|---|
| no prefetch, click at 0 | – | 440 | fallback 445, page 750 |
| hover, click at ~45 | `/_tree` 450, route 855 | 465 | old page until 905, then page; no fallback |
| hover, click at ~640 | `/_tree` 445, route 855 | 1065 | empty 900–1270, then page; no fallback |

The hover sends two prefetch requests: the route tree
(`Next-Router-Segment-Prefetch: /_tree`), then a dynamic prefetch of the route
(`Next-Router-Prefetch: 1` with the state tree), whose response has the
loading data but nothing for the page segment. The blank appears when the
click lands before that second response and the page's data arrives after it;
it lasts roughly click time + page time − prefetch response time.
