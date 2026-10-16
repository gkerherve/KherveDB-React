// Tabs that share the space of the NIST results table: the NIST entries first,
// then reference tables for the selected element. Tabs can be hidden in
// Edit > Preferences.
import { useState, type ReactNode } from "react";
import type { LineStat } from "./data";
import {
  C1S_SHIFTS, CALIBRATION_BE, CALIBRATION_KE, DOUBLETS, GHOSTS, NOTATION, SATELLITES, plasmon,
  type ElTables, type TablesFile,
} from "./refTables";

export const TABS: { id: string; title: string; help: string }[] = [
  { id: "nist", title: "NIST entries", help: "The NIST XPS database entries for the selected element." },
  { id: "levels", title: "Core levels", help: "Binding and kinetic energies, photoionisation cross sections (relative to C 1s) and IMFP of every core level, for Al Kα and Mg Kα." },
  { id: "spinorbit", title: "Spin-orbit", help: "Doublet separations and the theoretical (2j+1) area ratios, with the NIST median separation when available." },
  { id: "xray", title: "X-ray lines (EDS/XRF)", help: "K, L and M emission lines with NIST SRD 128 energies, radiative rates and fluorescence yields." },
  { id: "satellites", title: "Satellites & ghosts", help: "Where Mg/Al X-ray satellites and ghost lines of the main peak appear." },
  { id: "plasmon", title: "Plasmons", help: "Free-electron bulk and surface plasmon loss energies." },
  { id: "calibration", title: "Calibration", help: "ISO 15472 reference energies for calibrating the energy scale." },
  { id: "c1s", title: "C 1s shifts", help: "Typical C 1s binding energies of carbon functional groups." },
  { id: "notation", title: "Notation", help: "XPS (spectroscopic) and X-ray (IUPAC) notation of the core levels." },
];

type Props = {
  element: string | null;
  tables: TablesFile | null;
  stats: LineStat[];
  hidden: Set<string>;
  nist: ReactNode;
};

export default function DataTabs({ element, tables, stats, hidden, nist }: Props) {
  const visible = TABS.filter((t) => t.id === "nist" || !hidden.has(t.id));
  const [active, setActive] = useState("nist");
  const current = visible.some((t) => t.id === active) ? active : "nist";
  const t = element && tables ? tables.elements[element] : undefined;

  return (
    <div className="datatabs">
      {visible.length > 1 && (
        <nav className="dt-tabs" role="tablist">
          {visible.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={tab.id === current}
              className={tab.id === current ? "active" : ""}
              title={tab.help}
              onClick={() => setActive(tab.id)}
            >
              {tab.title}
            </button>
          ))}
        </nav>
      )}
      {current === "nist" ? nist : (
        <div className="dt-page">
          <Page id={current} el={element} t={t} stats={stats} source={tables?.source} />
        </div>
      )}
    </div>
  );
}

function Page({ id, el, t, stats, source }: { id: string; el: string | null; t?: ElTables; stats: LineStat[]; source?: string }) {
  const perElement = ["levels", "spinorbit", "xray", "satellites", "plasmon"].includes(id);
  if (perElement && (!el || !t)) return <p className="muted">Select an element in the periodic table.</p>;
  switch (id) {
    case "levels": return <Levels t={t!} el={el!} source={source} />;
    case "spinorbit": return <SpinOrbit t={t!} el={el!} stats={stats} />;
    case "xray": return <XRay t={t!} el={el!} />;
    case "satellites": return <Satellites t={t!} el={el!} stats={stats} />;
    case "plasmon": return <Plasmon t={t!} el={el!} />;
    case "calibration": return <Calibration />;
    case "c1s": return <C1s />;
    case "notation": return <Notation />;
  }
  return null;
}

const f = (v: number | null | undefined, n: number) => (v == null ? "—" : v.toFixed(n));

function Table({ head, rows, note }: { head: string[]; rows: (string | number)[][]; note?: ReactNode }) {
  return (
    <>
      <table className="dt-table">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}
        </tbody>
      </table>
      {note && <p className="dt-note">{note}</p>}
    </>
  );
}

function Levels({ t, el, source }: { t: ElTables; el: string; source?: string }) {
  const rows = [...t.levels].sort((a, b) => b.be - a.be).map((l) => [
    `${el} ${l.orb}`, l.iupac, f(l.be, 1),
    f(l.keAl, 1), f(l.csAl, 3), f(l.imfpAl, 2), l.imfpAl ? (3 * l.imfpAl).toFixed(1) : "—",
    f(l.keMg, 1), f(l.csMg, 3), f(l.imfpMg, 2),
  ]);
  return (
    <Table
      head={["Level", "X-ray", "BE (eV)", "KE Al (eV)", "σ Al / C 1s", "IMFP Al (nm)", "Depth 3λ (nm)", "KE Mg (eV)", "σ Mg / C 1s", "IMFP Mg (nm)"]}
      rows={rows}
      note={<>Binding energies are free-atom edge energies (Larkins / Deslattes), so they can differ by a few eV from the solid-state NIST values. σ: partial photoionisation cross sections relative to C 1s at the same photon energy (Al Kα 1486.6 eV, Mg Kα 1253.6 eV); divide by an analyser transmission and IMFP correction for sensitivity factors. IMFP: Seah &amp; Dench (1979) for the element. Source: {source}.</>}
    />
  );
}

function SpinOrbit({ t, el, stats }: { t: ElTables; el: string; stats: LineStat[] }) {
  const be = new Map(t.levels.map((l) => [l.orb, l.be]));
  const nist = new Map(stats.filter((s) => s.el === el && s.count >= 2).map((s) => [s.line, s.median]));
  const rows = DOUBLETS.filter(([hi, lo]) => be.has(hi) && be.has(lo)).map(([hi, lo, ratio]) => {
    const n = nist.has(hi) && nist.has(lo) ? (nist.get(lo)! - nist.get(hi)!).toFixed(2) : "—";
    const csHi = t.levels.find((l) => l.orb === hi)?.csAl, csLo = t.levels.find((l) => l.orb === lo)?.csAl;
    return [
      `${el} ${hi.slice(0, 2)}`, `${hi} / ${lo}`, be.get(lo)! - be.get(hi)! >= 0.05 ? f(be.get(lo)! - be.get(hi)!, 2) : "—", n,
      ratio === 1.5 ? "3 : 2" : ratio === 2 ? "2 : 1" : "4 : 3",
      csHi && csLo ? (csHi / csLo).toFixed(2) : "—",
    ];
  });
  if (!rows.length) return <p className="muted">{el} has no spin-orbit split core levels.</p>;
  return (
    <Table
      head={["Doublet", "Components", "ΔE free atom (eV)", "ΔE NIST median (eV)", "Area ratio (2j+1)", "Ratio from σ (Al)"]}
      rows={rows}
      note="Use the area ratio and ΔE as constraints when fitting doublets. The NIST column is the difference of the median NIST binding energies of both components."
    />
  );
}

function XRay({ t, el }: { t: ElTables; el: string }) {
  const lines = [...t.xray].sort((a, b) => a.keV - b.keV);
  if (!lines.length) return <p className="muted">No X-ray emission lines for {el} (too light).</p>;
  const max = Math.max(20, Math.min(100, Math.ceil(Math.max(...lines.map((l) => l.keV)) / 5) * 5));
  const W = 900, H = 150, P = 28;
  const x = (e: number) => P + ((W - 2 * P) * e) / max;
  const ticks = Array.from({ length: 11 }, (_, i) => (max * i) / 10);
  // Label the strongest line of each cluster only, so labels never overlap
  const labelled = new Set<string>();
  [...lines].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0)).forEach((l) => {
    if ((l.rate ?? 0) < 0.3 || l.keV > max) return;
    if ([...labelled].every((n) => Math.abs(x(lines.find((k) => k.name === n)!.keV) - x(l.keV)) > 34)) labelled.add(l.name);
  });
  return (
    <>
      <svg className="dt-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${el} X-ray emission lines`}>
        <line x1={P} x2={W - P} y1={H - 24} y2={H - 24} className="axis" />
        {ticks.map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={H - 24} y2={H - 20} className="axis" />
            <text x={x(v)} y={H - 8} textAnchor="middle">{v.toFixed(0)}</text>
          </g>
        ))}
        <text x={W - P} y={H - 30} textAnchor="end" className="muted-text">keV</text>
        {lines.filter((l) => l.keV <= max).map((l) => {
          const h = 16 + 90 * (l.rate ?? 0.1);
          return (
            <g key={l.name}>
              <line x1={x(l.keV)} x2={x(l.keV)} y1={H - 24} y2={H - 24 - h} className={`stick fam-${l.name[0]}`}>
                <title>{`${el} ${l.name} (${l.iupac}) ${l.keV.toFixed(3)} keV`}</title>
              </line>
              {labelled.has(l.name) && <text x={x(l.keV)} y={H - 28 - h} textAnchor="middle">{l.name}</text>}
            </g>
          );
        })}
      </svg>
      <Table
        head={["Line", "IUPAC", "Energy (keV)", "NIST measured (eV)", "NIST theory (eV)", "Rel. rate in shell"]}
        rows={lines.map((l) => [`${el} ${l.name}`, l.iupac, l.keV.toFixed(4), f(l.nistExp, 2), f(l.nistTh, 1), f(l.rate, 3)])}
        note={<>Fluorescence yields: {Object.entries(t.yield).map(([k, v]) => `ω${k} = ${v.toFixed(3)}`).join(", ") || "—"}. Energies from xraylib; NIST SRD 128 has K and L lines only (Ne–Fm). Lines below ~1 keV are hard to resolve with EDS.</>}
      />
    </>
  );
}

function mainBe(t: ElTables, el: string, stats: LineStat[]): { line: string; be: number } | null {
  const mine = stats.filter((s) => s.el === el).sort((a, b) => b.count - a.count);
  if (mine.length) return { line: mine[0].line, be: mine[0].median };
  const best = t.levels.filter((l) => l.csAl).sort((a, b) => (b.csAl ?? 0) - (a.csAl ?? 0))[0];
  return best ? { line: best.orb, be: best.be } : null;
}

function Satellites({ t, el, stats }: { t: ElTables; el: string; stats: LineStat[] }) {
  const m = mainBe(t, el, stats);
  if (!m) return <p className="muted">No core level available for {el}.</p>;
  const sat = SATELLITES.map((s) => [s.line, `−${s.mg[0]}`, `${s.mg[1]} %`, (m.be - s.mg[0]).toFixed(1), `−${s.al[0]}`, `${s.al[1]} %`, (m.be - s.al[0]).toFixed(1)]);
  const at = (shift: number) => (isNaN(shift) || m.be + shift < 0 ? "—" : (m.be + shift).toFixed(1));
  const gh = GHOSTS.map((g) => [g.from, at(g.mg), at(g.al)]);
  return (
    <>
      <h4>Non-monochromatic X-ray satellites of {el} {m.line} ({m.be.toFixed(1)} eV)</h4>
      <Table head={["Satellite", "Mg shift (eV)", "Mg intensity", "Mg apparent BE", "Al shift (eV)", "Al intensity", "Al apparent BE"]} rows={sat}
        note="Satellites appear at lower binding energy than the parent peak (Krause & Ferreira; Hofmann 2013, Table 2.2). They vanish with a monochromated source." />
      <h4>Ghost lines of {el} {m.line}</h4>
      <Table head={["Contaminating radiation", "Apparent BE, Mg anode (eV)", "Apparent BE, Al anode (eV)"]} rows={gh}
        note="From the PHI Handbook of XPS, Table 3. Ghosts come from an oxidised or worn anode, Cu from the anode base, or the cross-contamination of twin anodes." />
    </>
  );
}

function Plasmon({ t, el }: { t: ElTables; el: string }) {
  const p = plasmon(el, t);
  if (!p) return <p className="muted">No free-electron plasmon estimate for {el}: the model only holds for s/p metals and semiconductors (Na, Mg, Al, Si, Ge…).</p>;
  return (
    <Table
      head={["Element", "Nv", "ρ (g/cm³)", "M (g/mol)", "Bulk plasmon (eV)", "Surface plasmon (eV)"]}
      rows={[[el, p.nv, f(t.density, 2), t.mass.toFixed(2), p.bulk.toFixed(2), p.surface.toFixed(2)]]}
      note="Epl = 28.82 √(Nv ρ / M) eV (van der Heide 2011, Eq. 4.1b and Table 5.4). Loss peaks appear at BE + n·Epl above each core level. Interband transitions shift the real value (e.g. Ag)."
    />
  );
}

const Calibration = () => (
  <>
    <Table head={["Peak", "Mono Al Kα BE (eV)", "Al Kα BE (eV)", "Mg Kα BE (eV)"]} rows={CALIBRATION_BE} />
    <Table head={["Auger peak", "KE differential (eV)", "KE direct (eV)"]} rows={CALIBRATION_KE}
      note="Sputter-cleaned Au, Ag and Cu foils, referenced to the Fermi level (ISO 15472; Seah; Hofmann 2013, Tables 8.2-8.3)." />
  </>
);

const C1s = () => (
  <Table head={["Carbon group", "C 1s BE (eV)", "Shift vs C–C"]} rows={C1S_SHIFTS}
    note="Typical values, charge-referenced to adventitious C–C at 284.8 eV; ±0.2 eV. Secondary (β) shifts add about +0.2-0.4 eV (Biesinger 2022; Beamson & Briggs 1992)." />
);

const Notation = () => (
  <Table head={["XPS level", "X-ray level"]} rows={NOTATION}
    note="Auger and X-ray lines are written with X-ray levels: Cu L3M4,5M4,5 (Auger), Fe K-L3 = Kα1 (X-ray)." />
);
