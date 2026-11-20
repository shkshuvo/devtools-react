import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, Menu, Moon, Search, Star, Sun } from "lucide-react";
import "@fontsource-variable/geist/index.css";
import "@fontsource-variable/geist-mono/index.css";
import "./styles.css";
import { byId, groups, localCount, newest, origin, popular } from "./catalog";
import Brand from "./components/Brand";
import Sidebar from "./components/Sidebar";
import Listing from "./components/Listing";
import SearchDialog from "./components/SearchDialog";
import Dashboard from "./components/Dashboard";
import Workbench from "./components/Workbench";
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function useSaved(key, initial) {
  const [v, set] = useState(() => read(key, initial));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  }, [key, v]);
  return [v, set];
}
function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || "/"),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(false);
  const [dark, setDark] = useSaved(
      "devtools-dark",
      matchMedia("(prefers-color-scheme: dark)").matches,
    ),
    [favs, setFavs] = useSaved("devtools-favorites", []),
    [recent, setRecent] = useSaved("devtools-recent", []);
  const toggle = (id) =>
    setFavs((v) => (v.includes(id) ? v.filter((x) => x !== id) : [id, ...v]));
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    function nav() {
      setRoute(location.hash.slice(1) || "/");
      setMobile(false);
      setSearch(false);
      window.scrollTo(0, 0);
    }
    function key(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
      if (e.key === "Escape") setMobile(false);
    }
    window.addEventListener("hashchange", nav);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("hashchange", nav);
      window.removeEventListener("keydown", key);
    };
  }, []);
  const [, type, ...parts] = route.split("/");
  let id;
  try {
    id = decodeURIComponent(parts.join("/"));
  } catch {
    id = "";
  }
  const selected = type === "tool" ? byId.get(id) : null,
    category = groups.find((g) => g.id === id);
  useEffect(() => {
    if (selected?.local)
      setRecent((v) =>
        [selected.id, ...v.filter((i) => i !== selected.id)].slice(0, 20),
      );
    document.title =
      (selected?.name ?? category?.name ?? "Dashboard") + " · DevTools";
  }, [route]);
  let page;
  if (route === "/") page = <Dashboard />;
  else if (selected?.local)
    page = (
      <>
        <a href={"#/category/" + selected.category} className="back">
          <ArrowLeft size={16} />
          {groups.find((g) => g.id === selected.category)?.name}
        </a>
        <div className="row">
          <h1>{selected.name}</h1>
          <button
            className="icon"
            aria-label="Toggle favorite"
            aria-pressed={favs.includes(id)}
            onClick={() => toggle(id)}
          >
            <Star fill={favs.includes(id) ? "currentColor" : "none"} />
          </button>
        </div>
        <p className="lead">{selected.description}</p>
        <Workbench key={id} tool={selected} />
      </>
    );
  else if (type === "category" && category)
    page = (
      <Listing
        key={route}
        title={category.name}
        items={category.tools}
        favs={favs}
        toggle={toggle}
      />
    );
  else if (
    type === "list" &&
    ["popular", "new", "favorites", "recent"].includes(id)
  ) {
    const [title, ids] = {
      popular: ["Popular Tools", popular],
      new: ["New Tools", newest],
      favorites: ["Favorites", favs],
      recent: ["Recently Used", recent],
    }[id];
    page = (
      <Listing
        key={route}
        title={title}
        items={ids.map((x) => byId.get(x)).filter(Boolean)}
        favs={favs}
        toggle={toggle}
      />
    );
  } else
    page = (
      <>
        <h1>Page unavailable</h1>
        <a href="#/">Return to dashboard</a>
      </>
    );
  return (
    <>
      <Sidebar
        mobile={mobile}
        close={() => setMobile(false)}
        favs={favs}
        recent={recent}
      />
      <div className="shell">
        <header className="topbar">
          <button
            className="mobile icon"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <Brand />
          <div className="spacer" />
          <button className="search-btn" onClick={() => setSearch(true)}>
            <Search size={16} />
            Search tools... <kbd>Ctrl K</kbd>
          </button>
          <button
            className="icon"
            aria-label="Toggle theme"
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun /> : <Moon />}
          </button>
        </header>
        <main>{page}</main>
        <footer>
          <Brand />
          <span>{localCount} local workspaces</span>
          <a target="_blank" rel="noreferrer" href={origin}>
            Reference website ↗
          </a>
        </footer>
      </div>
      {search && <SearchDialog close={() => setSearch(false)} />}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
