import { connection } from "next/server";

export default async function Item({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  // Stands in for the page's data reads.
  const ms = Number(process.env.PAGE_DELAY_MS ?? 600);
  await new Promise((r) => setTimeout(r, ms));
  return (
    <article>
      <h1>Item {id}</h1>
      <p>Rendered at {new Date().toISOString()}</p>
    </article>
  );
}
