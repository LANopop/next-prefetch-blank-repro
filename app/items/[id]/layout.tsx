import { connection } from "next/server";

// Per-request work above the loading boundary (session, membership checks).
// A prefetch of /items/[id] renders this layout, so it delays the prefetch.
export default async function ItemLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const ms = Number(process.env.LAYOUT_DELAY_MS ?? 0);
  if (ms) await new Promise((r) => setTimeout(r, ms));
  return <section>{children}</section>;
}
