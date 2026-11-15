import Link from "next/link";

// Same targets as /items, with a plain <Link> and its default prefetch
// (on entering the viewport). Clicking shortly after the page loads hits the
// same race as the intent prefetch on /items.
export default function DefaultLinkItems() {
  return (
    <div>
      <h1>Items (default Link prefetch)</h1>
      <ul>
        {[1, 2, 3].map((id) => (
          <li key={id}>
            <Link href={`/items/${id}`}>Item {id}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
