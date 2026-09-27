// "General Properties" tab of the references window (#props/<element>).
import { useEffect, useState } from "react";
import type { ElementsFile } from "./data";

export const PROPERTY_GROUPS: [string, string[]][] = [
  ["Atomic", ["Atomic Number", "Atomic Mass", "Electron Configuration", "Ground State", "Electronegativity", "Atomic Radius", "Ionization Energy"]],
  ["Physical", ["State at 20°C", "Density", "Melting Point", "Boiling Point", "Specific Heat", "Group", "Period", "Category"]],
  ["XPS", ["Common Core Levels", "Most Intense Line", "Typical FWHM", "Chemical Shift Range"]],
];

const elementFromHash = () => decodeURIComponent(location.hash.replace(/^#props\/?/, "")) || "C";

export default function PropsPage() {
  const [meta, setMeta] = useState<ElementsFile | null>(null);
  const [el, setEl] = useState(elementFromHash);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/elements.json`).then((r) => r.json()).then(setMeta);
    const onHash = () => setEl(elementFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const m = meta?.elements[el];
  if (!m) return null;
  return (
    <div className="props-page">
      <header className="panel-head">
        <span className={`info-sym cat-${m.cat}`}>{el}</span>
        <div>
          <div className="info-name">{String(m.props.Name ?? el)}</div>
          <div className="muted">Atomic number {m.z}</div>
        </div>
      </header>
      {PROPERTY_GROUPS.map(([group, keys]) => {
        const present = keys.filter((k) => m.props[k] != null && m.props[k] !== "");
        return present.length ? (
          <section key={group}>
            <h3>{group}</h3>
            <dl className="props">
              {present.map((k) => <Row key={k} k={k} v={String(m.props[k])} />)}
            </dl>
          </section>
        ) : null;
      })}
      {meta.overlaps[el] && (
        <section>
          <h3>Common XPS overlaps</h3>
          <p>{meta.overlaps[el]}</p>
        </section>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (<><dt>{k}</dt><dd>{v}</dd></>);
}
