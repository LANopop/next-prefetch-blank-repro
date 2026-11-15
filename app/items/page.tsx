import { IntentLink } from "../intent-link";

export default function Items() {
  return (
    <div>
      <h1>Items</h1>
      <ul>
        {[1, 2, 3].map((id) => (
          <li key={id}>
            <IntentLink href={`/items/${id}`}>Item {id}</IntentLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
