import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { tools } from "../catalog";
import { match } from "../catalog/search";
import { ToolLink } from "./Dashboard";
export default function SearchDialog({ close }) {
  const ref = useRef(null),
    [query, set] = useState(""),
    [local, only] = useState(false);
  const hits = tools
    .filter((t) => (!local || t.local) && match(t, query))
    .sort((a, b) => Number(b.local) - Number(a.local));
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="dialog-body">
        <div className="row">
          <Search size={20} />
          <input
            aria-label="Search all tools"
            autoFocus
            placeholder="Search tools..."
            value={query}
            onChange={(e) => set(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.nativeEvent.isComposing &&
                hits.length
              ) {
                document.querySelector(".hits a")?.click();
              }
            }}
          />
          <button onClick={close} aria-label="Close search">
            <X size={18} />
          </button>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={local}
            onChange={(e) => only(e.target.checked)}
          />
          Local only · {hits.length} results
        </label>
        <div className="hits">
          {hits.length ? (
            hits.map((t) => (
              <ToolLink key={t.id} tool={t} onClick={close}>
                <span>{t.name}</span>
                <small>{t.local ? "Local" : "Online"}</small>
              </ToolLink>
            ))
          ) : (
            <p>No matching tools.</p>
          )}
        </div>
      </div>
    </dialog>
  );
}
