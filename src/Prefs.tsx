// Preferences (Edit > Preferences… on desktop, the ⚙ button on the web):
// which reference tabs are shown next to the NIST entries.
import { useEffect, useState } from "react";
import { TABS } from "./DataTabs";
import { isDesktop } from "./platform";

const KEY = "khervedb.hiddenTabs";

function readHidden(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function useHiddenTabs() {
  const [hidden, setHidden] = useState(readHidden);
  const update = (next: Set<string>) => {
    setHidden(next);
    try {
      localStorage.setItem(KEY, JSON.stringify([...next]));
    } catch { /* private window: keep for this session only */ }
  };
  return [hidden, update] as const;
}

/** Calls `open` when the desktop Edit > Preferences… menu item is chosen. */
export function usePrefsMenu(open: () => void) {
  useEffect(() => {
    if (!isDesktop) return;
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event").then(({ listen }) =>
      listen("open-prefs", open).then((u) => (unlisten = u)),
    );
    return () => unlisten?.();
  }, [open]);
}

export function PrefsDialog({ hidden, onChange, onClose }: {
  hidden: Set<string>;
  onChange: (h: Set<string>) => void;
  onClose: () => void;
}) {
  const tabs = TABS.filter((t) => t.id !== "nist");
  const toggle = (id: string) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Preferences" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>Preferences</h3>
          <button className="icon" onClick={onClose} aria-label="Close">×</button>
        </header>
        <p className="muted small">Tabs shown next to the NIST entries. Untick a tab to hide it.</p>
        <ul className="pref-list">
          {tabs.map((t) => (
            <li key={t.id}>
              <label title={t.help}>
                <input type="checkbox" checked={!hidden.has(t.id)} onChange={() => toggle(t.id)} />
                {t.title}
              </label>
            </li>
          ))}
        </ul>
        <footer>
          <button className="secondary" onClick={() => onChange(new Set())}>Show all</button>
          <button className="secondary" onClick={() => onChange(new Set(tabs.map((t) => t.id)))}>Hide all</button>
          <button className="primary" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
}
