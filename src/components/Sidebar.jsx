import {
  Activity,
  Bot,
  Calculator,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe,
  History,
  LayoutDashboard,
  Newspaper,
  BookOpen,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useState } from "react";
import { byId, groups, newest, origin, popular, toolHref } from "../catalog";
import Brand from "./Brand";
import { CategoryIcon } from "./Icons";
import { ToolLink } from "./Dashboard";
const extra = [
  ["World Map", "world-map", Globe],
  ["World Time", "world-time", Clock],
  ["Scientific Calculator", "scientific-calculator", Calculator],
  ["AI Community Hub", "ai", Bot],
  ["LLM Benchmarks", "llm-benchmarks", Activity],
];
export default function Sidebar({ mobile, close, favs, recent }) {
  const [expanded, set] = useState("");
  const sections = [
    { id: "popular", name: "Popular Tools", items: popular, icon: Star },
    { id: "new", name: "New Tools", items: newest, icon: Sparkles },
    ...groups.map((g, i) => ({
      ...g,
      index: i,
      items: g.tools.map((t) => t.id),
    })),
    { id: "favorites", name: "Favorites", items: favs, icon: Star },
    { id: "recent", name: "Recently used", items: recent, icon: History },
  ];
  return (
    <>
      {mobile && (
        <button
          className="scrim"
          onClick={close}
          aria-label="Close navigation"
        />
      )}
      <aside className={mobile ? "open" : ""}>
        <div className="brandbar">
          <Brand />
          <button className="mobile" onClick={close} aria-label="Close menu">
            <X />
          </button>
        </div>
        <nav
          onClick={(e) => {
            if (e.target.closest("a")) close();
          }}
        >
          <a href="#/" className="navitem dashboard">
            <LayoutDashboard />
            Dashboard
          </a>
          <hr />
          {extra.map(([name, id, I]) => (
            <a
              className="navitem"
              key={id}
              href={byId.has(id) ? toolHref(byId.get(id)) : origin + "/" + id}
              target={byId.get(id)?.local ? undefined : "_blank"}
              rel="noreferrer"
            >
              <I />
              {name}
              {id === "world-time" && <small className="live">Live</small>}
            </a>
          ))}
          <hr />
          {sections.map((s) => (
            <div key={s.id}>
              <button
                className="navgroup"
                aria-expanded={expanded === s.id}
                onClick={() => set(expanded === s.id ? "" : s.id)}
              >
                {s.icon ? <s.icon /> : <CategoryIcon index={s.index} />}
                <span>{s.name}</span>
                <small>{s.items.length}</small>
                <ChevronRight className={expanded === s.id ? "rotated" : ""} />
              </button>
              {expanded === s.id && (
                <div className="navchildren">
                  <a
                    href={
                      "#/" +
                      (s.index === undefined ? "list" : "category") +
                      "/" +
                      s.id
                    }
                  >
                    View all {s.name.toLowerCase()} →
                  </a>
                  {s.items.map(
                    (id) =>
                      byId.has(id) && (
                        <ToolLink key={id} tool={byId.get(id)}>
                          {byId.get(id).name}
                        </ToolLink>
                      ),
                  )}
                </div>
              )}
            </div>
          ))}
          <hr />
          {[
            ["Blog", "blog", Newspaper],
            ["Cheat Sheets", "cheatsheets", BookOpen],
          ].map(([name, url, I]) => (
            <a
              key={url}
              className="navitem"
              href={origin + "/" + url}
              target="_blank"
              rel="noreferrer"
            >
              <I />
              {name}
              <ExternalLink size={12} />
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}
