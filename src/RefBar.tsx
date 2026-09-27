// Tab bar + toolbar at the top of the desktop "Other Databases & Properties" window.
// The pages themselves are real browser views managed by Tauri below this bar.
import { useEffect, useState } from "react";
import { invoke } from "./platform";
import { PROPS_TAB, SOURCES } from "./sources";
import "./RefBar.css";

type Tab = { id: string; title: string; url: string };
type RefState = { element: string; name: string; tabs: Tab[]; active: string };

const HELP: Record<string, string> = Object.fromEntries([
  ...SOURCES.map((s) => [s.id, s.help]),
  [PROPS_TAB.id, PROPS_TAB.help],
]);

export default function RefBar() {
  const [st, setSt] = useState<RefState | null>(null);
  const [terms, setTerms] = useState("");

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    invoke<RefState>("get_ref_state").then(setSt);
    import("@tauri-apps/api/event").then(({ listen }) =>
      listen<RefState>("ref-state", (e) => setSt(e.payload)).then((u) => (unlisten = u)),
    );
    return () => unlisten?.();
  }, []);

  // New element: clear the search box
  useEffect(() => setTerms(""), [st?.element]);

  if (!st) return null;
  const source = SOURCES.find((s) => s.id === st.active);
  const act = (action: string) => invoke("ref_action", { action });
  const search = () => {
    if (!source?.search) return;
    invoke("ref_navigate", { id: source.id, url: source.search.query(terms.trim() || st.name) });
  };

  return (
    <div className="refbar">
      <nav className="tabs" role="tablist">
        {st.tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === st.active}
            className={t.id === st.active ? "active" : ""}
            title={HELP[t.id]}
            onClick={() => invoke("select_ref_tab", { id: t.id })}
          >
            {t.title}
          </button>
        ))}
      </nav>
      <div className="toolbar">
        <span className="el" title={`${st.name} – click another element in the main window to follow it here`}>
          {st.element}
        </span>
        <button onClick={() => act("back")} title="Go back to the previous page">◄</button>
        <button onClick={() => act("forward")} title="Go forward to the next page">►</button>
        <button onClick={() => act("home")} title={`Return to the ${st.name} start page of this tab`}>Home</button>
        <button onClick={() => act("reload")} title="Reload the current page">⟳</button>
        <button onClick={() => act("zoom_out")} title="Zoom out">−</button>
        <button onClick={() => act("zoom_reset")} title="Reset zoom">100%</button>
        <button onClick={() => act("zoom_in")} title="Zoom in">+</button>
        {source?.search && (
          <form className="search" onSubmit={(e) => { e.preventDefault(); search(); }}>
            <input
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder={source.search.placeholder}
              title={source.help}
            />
            <button type="submit" className="go">Search</button>
          </form>
        )}
      </div>
      <p className="hint" title={HELP[st.active]}>ⓘ {HELP[st.active]}</p>
    </div>
  );
}
