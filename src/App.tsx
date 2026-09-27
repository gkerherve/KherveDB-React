import { useCallback, useEffect, useMemo, useState } from "react";
import { elementInfo, lineStats, loadAll, type ElementsFile, type NistDb } from "./data";
import PeriodicTable from "./PeriodicTable";
import ResultsTable from "./ResultsTable";
import { BePlot, FloatingWindow, InfoContent, RowDetails } from "./Popups";
import { SOURCES } from "./sources";
import { isDesktop, openReference } from "./platform";
import "./App.css";

type Popup =
  | { kind: "info"; el: string; x: number; y: number }
  | { kind: "row"; row: number }
  | { kind: "plot" }
  | null;

const PROPERTY_GROUPS: [string, string[]][] = [
  ["Atomic", ["Atomic Number", "Atomic Mass", "Electron Configuration", "Ground State", "Electronegativity", "Atomic Radius", "Ionization Energy"]],
  ["Physical", ["State at 20°C", "Density", "Melting Point", "Boiling Point", "Specific Heat"]],
  ["XPS", ["Common Core Levels", "Most Intense Line", "Typical FWHM", "Chemical Shift Range"]],
];

export default function App() {
  const [data, setData] = useState<{ db: NistDb; meta: ElementsFile } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [element, setElement] = useState<string | null>("C");
  const [line, setLine] = useState("");
  const [formula, setFormula] = useState("");
  const [name, setName] = useState("");
  const [popup, setPopup] = useState<Popup>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    loadAll().then(setData, (e) => setError(String(e)));
  }, []);

  const db = data?.db;
  const meta = data?.meta;
  const withData = useMemo(() => db?.elementsWithData() ?? new Set<string>(), [db]);
  const stats = useMemo(() => (db ? lineStats(db) : []), [db]);
  const lines = useMemo(() => (db && element ? db.linesFor(element) : []), [db, element]);
  const rows = useMemo(
    () => (db ? db.filter(element, line, formula, name) : []),
    [db, element, line, formula, name],
  );

  const select = useCallback((el: string) => {
    setElement(el);
    setLine("");
  }, []);
  const open = useCallback((el: string) => {
    setElement(el);
    setLine("");
    setPanelOpen(true);
  }, []);
  const showInfo = useCallback((el: string, x: number, y: number) => setPopup({ kind: "info", el, x, y }), []);

  if (error) return <div className="loading">Could not load the NIST database: {error}</div>;
  if (!db || !meta) return <div className="loading"><img src="icon.png" alt="" />Loading NIST library…</div>;

  const m = element ? meta.elements[element] : null;

  return (
    <div className={`app${panelOpen ? " with-panel" : ""}`}>
      <main className="main">
        <PeriodicTable
          meta={meta}
          withData={withData}
          selected={element}
          onSelect={select}
          onOpen={open}
          onInfo={showInfo}
        />

        <section className="searchbar">
          <label title={"Element currently shown in the results table.\nClick a tile in the periodic table to change it."}>
            <span>Element</span>
            <output className="el-box">{element ?? "—"}</output>
          </label>
          <label title={"Restrict the results to one core level (e.g. 2p3/2).\n'All lines' shows every line recorded for the element."}>
            <span>XPS line</span>
            <select value={line} onChange={(e) => setLine(e.target.value)}>
              <option value="">All lines</option>
              {lines.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <label title={"Filter by chemical formula, e.g. Fe2O3 or TiO2.\nMatches any part of the formula."}>
            <span>Formula</span>
            <input value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="e.g. Fe2O3" />
          </label>
          <label title={"Filter by compound name, e.g. oxide, carbide, polymer.\nMatches any part of the name."}>
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. oxide" />
          </label>
          <button
            className="secondary"
            onClick={() => setPopup({ kind: "plot" })}
            disabled={!rows.length}
            title="Plot the binding energies of the results currently in the table"
          >
            Plot results
          </button>
          <button
            className="primary big"
            onClick={() => setPanelOpen((v) => !v)}
            title={
              "Open the reference panel for the selected element:\n" +
              "  • XPS Fitting (Biesinger), Harwell XPS Guru, Thermo Knowledge\n" +
              "  • Surface Science Spectra and electronic-structure papers on Google Scholar\n" +
              "  • General physical and atomic properties\n" +
              "Tip: double-clicking an element also opens it."
            }
          >
            Other Databases<br />&amp; Properties {panelOpen ? "◄" : "►"}
          </button>
        </section>

        <ResultsTable db={db} rows={rows} onRowClick={(row) => setPopup({ kind: "row", row })} />
      </main>

      {panelOpen && m && element && (
        <aside className="panel" aria-label="Other databases and properties">
          <header className="panel-head">
            <span className={`info-sym cat-${m.cat}`}>{element}</span>
            <div>
              <div className="info-name">{String(m.props.Name ?? element)}</div>
              <div className="muted">Atomic number {m.z}</div>
            </div>
            <button className="icon" onClick={() => setPanelOpen(false)} aria-label="Close panel" title="Close">×</button>
          </header>
          <p className="hint">
            Follows the element you click in the periodic table.{" "}
            {isDesktop
              ? "Sites open in their own window, with cookie banners declined automatically."
              : "Sites open in a new browser tab."}
          </p>
          {SOURCES.map((s) => (
            <SourceCard key={s.id + element} source={s} element={element} meta={meta} />
          ))}
          <h3>Properties</h3>
          {PROPERTY_GROUPS.map(([group, keys]) => (
            <dl key={group} className="props">
              <dt className="group">{group}</dt><dd />
              {keys.filter((k) => m.props[k] != null && m.props[k] !== "").map((k) => (
                <FragmentRow key={k} k={k} v={String(m.props[k])} />
              ))}
            </dl>
          ))}
        </aside>
      )}

      {popup?.kind === "info" && (
        <FloatingWindow title={`${popup.el} – XPS information`} x={popup.x} y={popup.y} onClose={() => setPopup(null)}>
          <InfoContent el={popup.el} meta={meta} info={elementInfo(popup.el, meta, stats)} />
        </FloatingWindow>
      )}
      {popup?.kind === "row" && (
        <FloatingWindow title={`${db.element[popup.row]} ${db.line[popup.row]} – ${db.formula[popup.row]}`} onClose={() => setPopup(null)} wide>
          <RowDetails db={db} row={popup.row} />
        </FloatingWindow>
      )}
      {popup?.kind === "plot" && (
        <FloatingWindow title="Binding energy distribution" onClose={() => setPopup(null)} wide>
          <BePlot db={db} rows={rows} title={`${element ?? "All"} ${line || "all lines"}`} />
        </FloatingWindow>
      )}
    </div>
  );
}

function FragmentRow({ k, v }: { k: string; v: string }) {
  return (<><dt>{k}</dt><dd>{v}</dd></>);
}

function SourceCard({ source, element, meta }: { source: (typeof SOURCES)[number]; element: string; meta: ElementsFile }) {
  const [terms, setTerms] = useState("");
  const go = () => {
    const url = source.search ? source.search.query(terms.trim(), meta.elements[element].props.Name as string ?? element) : source.url!(element, meta.elements[element]);
    openReference(`${source.title} – ${element}`, url);
  };
  return (
    <div className="card">
      <div className="card-title">{source.title}</div>
      <p className="muted small">{source.help}</p>
      {source.search ? (
        <form className="row" onSubmit={(e) => { e.preventDefault(); go(); }}>
          <input value={terms} onChange={(e) => setTerms(e.target.value)} placeholder={source.search.placeholder} title={source.help} />
          <button type="submit" className="secondary">Search</button>
        </form>
      ) : (
        <button className="secondary" onClick={go}>Open {source.title} ↗</button>
      )}
    </div>
  );
}
