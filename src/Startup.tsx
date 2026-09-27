// Starting image, first-run welcome window and (desktop) auto-update.
import { useEffect, useState } from "react";
import { FloatingWindow } from "./Popups";
import { isDesktop } from "./platform";

const WELCOME_KEY = "khervedb.hideWelcome";
const SKIP_UPDATE_KEY = "khervedb.skipUpdate";

function readFlag(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeFlag(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the choice just is not remembered */
  }
}

export function SplashScreen() {
  return (
    <div className="splash" role="status" aria-label="Loading KherveDB">
      <img src="Splash.png" alt="KherveDB – XPS Binding Energy Database – loading the NIST library" />
    </div>
  );
}

export function Welcome() {
  const [open, setOpen] = useState(() => readFlag(WELCOME_KEY) !== "1");
  const [dontShow, setDontShow] = useState(false);
  if (!open) return null;
  const close = () => {
    if (dontShow) writeFlag(WELCOME_KEY, "1");
    setOpen(false);
  };
  return (
    <FloatingWindow title="Welcome to KherveDB" onClose={close} wide>
      <div className="welcome">
        <img src="Welcome.png" alt="Welcome to KherveDB – XPS binding energies at your fingertips" />
        <ul>
          <li><b>Click</b> an element to list its XPS binding energies from the NIST database.</li>
          <li><b>Right-click</b> an element for its electronic structure, XPS peak positions and overlaps.</li>
          <li><b>Double-click</b> it, or press <b>Other Databases &amp; Properties</b>, for XPS Fitting, Harwell,
            Thermo and Google Scholar pages that follow the element you select.</li>
          <li>Filter with the <b>XPS line</b>, <b>Formula</b> and <b>Name</b> boxes; click a result for all its details.</li>
          <li>Hover over any control to see what it does.</li>
        </ul>
        <div className="welcome-foot">
          <label>
            <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
            Don't show this again
          </label>
          <button className="primary" onClick={close} autoFocus>Start</button>
        </div>
      </div>
    </FloatingWindow>
  );
}

type Available = { version: string; notes: string; install: () => Promise<void> };

/** Desktop: check GitHub for a newer signed release a few seconds after start. */
export function Updater() {
  const [update, setUpdate] = useState<Available | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isDesktop) return;
    const timer = setTimeout(async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const u = await check();
        if (!u || readFlag(SKIP_UPDATE_KEY) === u.version) return;
        setUpdate({
          version: u.version,
          notes: u.body ?? "",
          install: async () => {
            let total = 0, done = 0;
            await u.downloadAndInstall((ev) => {
              if (ev.event === "Started") total = ev.data.contentLength ?? 0;
              if (ev.event === "Progress") {
                done += ev.data.chunkLength;
                setStatus(total ? `Downloading… ${Math.round((done / total) * 100)} %` : "Downloading…");
              }
              if (ev.event === "Finished") setStatus("Installing…");
            });
            const { relaunch } = await import("@tauri-apps/plugin-process");
            await relaunch();
          },
        });
      } catch (e) {
        console.warn("Update check failed", e);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!update) return null;
  const later = () => setUpdate(null);
  return (
    <FloatingWindow title="KherveDB update" onClose={later}>
      <p>A new version of KherveDB is available: <b>{update.version}</b>.</p>
      {update.notes && <p className="muted update-notes">{update.notes}</p>}
      {status ? (
        <p><b>{status}</b></p>
      ) : (
        <div className="welcome-foot">
          <button className="secondary" onClick={() => { writeFlag(SKIP_UPDATE_KEY, update.version); later(); }}>
            Skip this version
          </button>
          <button className="secondary" onClick={later}>Later</button>
          <button
            className="primary"
            onClick={() => update.install().catch((e) => setStatus(`Update failed: ${e}`))}
            autoFocus
          >
            Install now
          </button>
        </div>
      )}
    </FloatingWindow>
  );
}
