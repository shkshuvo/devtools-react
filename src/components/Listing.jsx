import { useState } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { match } from "../catalog/search";
import { ToolLink } from "./Dashboard";
export default function Listing({ title, items, favs, toggle }) {
  const [query, set] = useState(""),
    [local, only] = useState(false);
  const hits = items.filter((t) => (!local || t.local) && match(t, query));
  return (
    <>
      <a href="#/" className="back">
        <ArrowLeft size={16} />
        Dashboard
      </a>
      <h1>{title}</h1>
      <div className="filters">
        <input
          type="search"
          aria-label="Filter tools"
          placeholder="Filter tools..."
          value={query}
          onChange={(e) => set(e.target.value)}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={local}
            onChange={(e) => only(e.target.checked)}
          />
          Local only
        </label>
        <small>{hits.length} tools</small>
      </div>
      <div className="grid">
        {hits.map((t) => (
          <article className="card" key={t.id}>
            <div className="row">
              <span className="badge">{t.local ? "Local" : "Online"}</span>
              <button
                className="icon"
                onClick={() => toggle(t.id)}
                aria-label={"Favorite " + t.name}
                aria-pressed={favs.includes(t.id)}
              >
                <Star
                  fill={favs.includes(t.id) ? "currentColor" : "none"}
                  size={17}
                />
              </button>
            </div>
            <ToolLink tool={t}>
              <h3>{t.name}</h3>
            </ToolLink>
            {t.description && <p>{t.description}</p>}
          </article>
        ))}
      </div>
      {!hits.length && <p>No tools to show.</p>}
    </>
  );
}
