# Blank segment when clicking a link while its `router.prefetch()` is in flight

Next.js 16.4.3, App Router, production build.

`/items` links to `/items/[id]` with `<Link prefetch={false}>` plus
`router.prefetch(href)` on pointer enter and focus (`app/intent-link.tsx`).
`/items/[id]` has its own `loading.tsx` and a page that takes 600 ms
(`PAGE_DELAY_MS`).

If the click lands while the hover prefetch is still loading the segment data,
the URL changes and `<main id="content">` renders **nothing** (no page, no
`loading.tsx` fallback) until the page arrives. Without a prefetch, or once
the prefetch has finished, the loading fallback shows as expected.

## Run

```bash
npm install
npx playwright install chromium   # for the probe only
npm run build
npm start                         # http://127.0.0.1:3100
```

By hand: open DevTools, Network, set a custom throttling profile with 400 ms
latency, go to `/items`, hover "Item 1" for about half a second, click. The
content area goes empty before "Item 1" appears.

Measured: in another terminal, run `npm run probe`. It throttles the network
to 400 ms latency with CDP, watches `#content` on every animation frame, and
counts navigations where it shows no text after the URL changed.

## Result (macOS, Chromium headless shell, 400 ms latency)

| Click | Blank content area |
|---|---|
| programmatic `el.click()`, no prefetch | 0/10 |
| hover, click after 2500 ms (prefetch done) | 0/10 |
| hover, click after 800 / 1200 / 1600 ms | 0/6 each |
| hover, click after 400 ms | 10/10, up to ~180 ms |
| hover, click after 600 ms | 10/10, up to ~380 ms |

The hover sends two prefetch requests: the route tree (`Next-Router-Segment-Prefetch: /_tree`,
done ~460 ms after the hover at this latency), then the segment data. The
blank window matches clicks that land while that second request is in flight.
