// Tabs that share the space of the NIST results table: the NIST entries first,
// then reference tables for the selected element. Tabs can be hidden in
// Edit > Preferences.
import { useEffect, useState, type ReactNode } from "react";
import type { ElementsFile, LineStat } from "./data";
import {
  C1S_SHIFTS, CALIBRATION_BE, CALIBRATION_KE, DOUBLETS, GHOSTS, NOTATION, PHOTON_SOURCES, SATELLITES, SPUTTER,
  WORK_FUNCTION, asymmetry, attenuationLength, augerLines, crossSection, imfpTPP2M, plasmon, valenceElectrons,
  type ElTables, type TablesFile,
} from "./refTables";
import MULTIPLETS from "./data/multiplets.json";
import AUGER_PARAMS from "./data/auger_parameters.json";

type Peak = { be?: number | null; fwhm?: number | null; fwhm20?: number | null; area?: number | null; label?: string };
type Multiplet = { el: string; compound: string; line: string; peaks: Peak[]; source: string; note?: string };
type AugerParam = { el: string; compound: string; be: number | null; line: string; auger: string; alpha: number | null; source: string; note?: string };

export const TABS: { id: string; title: string; help: string }[] = [
  { id: "nist", title: "NIST entries", help: "The NIST XPS database entries for the selected element." },
  { id: "levels", title: "Core levels", help: "Binding and kinetic energies, cross sections, asymmetry parameters and IMFP of every core level at the chosen photon energy (lab, HAXPES, UPS or synchrotron)." },
  { id: "spinorbit", title: "Spin-orbit", help: "Doublet separations and the theoretical (2j+1) area ratios, with the NIST median separation when available." },
  { id: "auger", title: "Auger", help: "Principal Auger lines (kinetic energy and apparent binding energy at the chosen photon energy) and the modified Auger parameter." },
  { id: "xray", title: "X-ray (EDS/XRF)", help: "K, L and M emission lines with NIST SRD 128 energies, radiative rates and fluorescence yields." },
  { id: "edges", title: "Edges (XAS)", help: "Absorption edges with jump ratios and fluorescence yields, and the X-ray attenuation length at the chosen photon energy." },
  { id: "multiplets", title: "Multiplets", help: "Published multiplet and shake-up fitting parameters (BE, FWHM, % area) for transition-metal compounds (Biesinger 2010, 2011)." },
  { id: "satellites", title: "Satellites", help: "Where Mg/Al X-ray satellites and ghost lines of the main peak appear." },
  { id: "plasmon", title: "Plasmons", help: "Free-electron bulk and surface plasmon loss energies." },
  { id: "sputter", title: "Sputter", help: "Ar⁺ sputtering yields and rate ratios of elements and oxides." },
  { id: "workfn", title: "Work fn", help: "Work functions of metals and oxides." },
  { id: "calibration", title: "Calibration", help: "ISO 15472 reference energies for calibrating the energy scale." },
  { id: "c1s", title: "C 1s", help: "Typical C 1s binding energies of carbon functional groups." },
  { id: "notation", title: "Notation", help: "XPS (spectroscopic) and X-ray (IUPAC) notation of the core levels." },
];

/** Tabs whose numbers depend on the photon energy: they show the source picker. */
const USES_HV = new Set(["levels", "auger", "edges"]);
const HV_KEY = "khervedb.photon";

type Props = {
  element: string | null;
  tables: TablesFile | null;
  meta: ElementsFile;
  stats: LineStat[];
  hidden: Set<string>;
  nist: ReactNode;
};

type Ctx = { el: string; t: ElTables; tf: TablesFile; meta: ElementsFile; stats: LineStat[]; hv: number };

function readHv(): { id: string; hv: number } {
  try {
    const v = JSON.parse(localStorage.getItem(HV_KEY) ?? "null");
    if (v && typeof v.hv === "number") return v;
  } catch { /* default below */ }
  return { id: "al", hv: 1486.6 };
}

export default function DataTabs({ element, tables, meta, stats, hidden, nist }: Props) {
  const visible = TABS.filter((t) => t.id === "nist" || !hidden.has(t.id));
  const [active, setActive] = useState("nist");
  const [photon, setPhoton] = useState(readHv);
  useEffect(() => {
    try { localStorage.setItem(HV_KEY, JSON.stringify(photon)); } catch { /* not kept */ }
  }, [photon]);
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
          {USES_HV.has(current) && <PhotonPicker photon={photon} onChange={setPhoton} />}
          <Page id={current} ctx={element && t && tables ? { el: element, t, tf: tables, meta, stats, hv: photon.hv } : null} />
        </div>
      )}
    </div>
  );
}

function PhotonPicker({ photon, onChange }: { photon: { id: string; hv: number }; onChange: (p: { id: string; hv: number }) => void }) {
  return (
    <div className="dt-source" title="Photon energy used for kinetic energies, cross sections, asymmetry parameters, IMFP and attenuation lengths">
      <label>
        Photon source{" "}
        <select
          value={photon.id}
          onChange={(e) => {
            const s = PHOTON_SOURCES.find((x) => x.id === e.target.value)!;
            onChange({ id: s.id, hv: s.id === "custom" ? photon.hv : s.hv });
          }}
        >
          {PHOTON_SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
      <label>
        hν{" "}
        <input
          type="number" min={10} max={15000} step={1} value={photon.hv}
          onChange={(e) => {
            const hv = Number(e.target.value);
            if (hv > 0) onChange({ id: "custom", hv });
          }}
        />{" "}eV
      </label>
    </div>
  );
}

function Page({ id, ctx }: { id: string; ctx: Ctx | null }) {
  switch (id) {
    case "calibration": return <Calibration />;
    case "c1s": return <C1s />;
    case "notation": return <Notation />;
    case "sputter": return <Sputter el={ctx?.el} />;
    case "workfn": return <WorkFunction el={ctx?.el} />;
  }
  if (!ctx) return <p className="muted">Select an element in the periodic table.</p>;
  const { el, t, stats } = ctx;
  switch (id) {
    case "levels": return <Levels ctx={ctx} />;
    case "spinorbit": return <SpinOrbit t={t} el={el} stats={stats} />;
    case "auger": return <Auger ctx={ctx} />;
    case "xray": return <XRay t={t} el={el} />;
    case "edges": return <Edges ctx={ctx} />;
    case "multiplets": return <Multiplets el={el} />;
    case "satellites": return <Satellites t={t} el={el} stats={stats} />;
    case "plasmon": return <Plasmon t={t} el={el} />;
  }
  return null;
}

const f = (v: number | null | undefined, n: number) => (v == null ? "—" : v.toFixed(n));
const sig = (v: number | null | undefined) => (v == null ? "—" : v >= 100 ? v.toFixed(0) : v >= 1 ? v.toPrecision(3) : v.toPrecision(2));

function Table({ head, rows, note, highlight }: { head: string[]; rows: (string | number)[][]; note?: ReactNode; highlight?: (r: (string | number)[]) => boolean }) {
  return (
    <>
      <table className="dt-table">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => <tr key={i} className={highlight?.(r) ? "hl" : ""}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}
        </tbody>
      </table>
      {note && <p className="dt-note">{note}</p>}
    </>
  );
}

function nvFor(ctx: Ctx) {
  const m = ctx.meta.elements[ctx.el];
  return m ? valenceElectrons(m.col, m.cat, m.z) : 0;
}

function Levels({ ctx }: { ctx: Ctx }) {
  const { el, t, tf, hv } = ctx;
  const c1s = tf.elements.C.levels.find((l) => l.orb === "1s")!;
  const sC = crossSection(tf, c1s, hv);
  const nv = nvFor(ctx);
  const rows = [...t.levels].sort((a, b) => b.be - a.be).map((l) => {
    const ke = hv - l.be;
    const s = ke > 0 ? crossSection(tf, l, hv) : null;
    const imfp = ke > 0 ? imfpTPP2M(el, t, nv, ke) : null;
    return [
      `${el} ${l.orb}`, l.iupac, f(l.be, 1), ke > 0 ? ke.toFixed(1) : "not excited",
      sig(s), s && sC ? (s / sC).toFixed(3) : "—", f(asymmetry(tf, l, hv), 2),
      f(imfp, 2), imfp ? (3 * imfp).toFixed(1) : "—",
    ];
  });
  return (
    <Table
      head={["Level", "X-ray", "BE (eV)", "KE (eV)", "σ (barn)", "σ / σ(C 1s)", "β", "IMFP (nm)", "Depth 3λ (nm)"]}
      rows={rows}
      note={<>At hν = {hv} eV. BE: free-atom edge energies (Larkins / Deslattes), which can differ by a few eV from the solid-state NIST values. σ: partial photoionisation cross sections (xraylib, Ebel / Scofield-type), relative to C 1s at the same hν. β: dipole asymmetry parameter (Trzhaskovskaya &amp; Yarzhemsky, Dirac-Fock, 1.5–10 keV; digitised by Cant et al., CC BY 4.0); at the magic angle 54.7° β drops out. IMFP: TPP-2M for the element (Nv = {nv}). Source: {tf.source}.</>}
    />
  );
}

function Auger({ ctx }: { ctx: Ctx }) {
  const { el, t, tf, hv } = ctx;
  const next = Object.values(tf.elements).find((x) => x.z === t.z + 1);
  const lines = augerLines(t, next);
  const measured = (AUGER_PARAMS as AugerParam[]).filter((a) => a.el === el);
  const table = measured.length > 0 && (
    <>
      <h4>Measured modified Auger parameters</h4>
      <Table head={["Compound", `BE ${measured[0].line} (eV)`, "Auger line", "α' (eV)", "Source"]}
        rows={measured.map((a) => [a.compound, f(a.be, 2), a.auger, f(a.alpha, 2), a.source + (a.note ? ` (${a.note})` : "")])}
        note="Biesinger et al., Appl. Surf. Sci. 257 (2010) 887. Charge-corrected to C 1s 284.8 eV." />
    </>
  );
  if (!lines.length) return table || <p className="muted">No core-core-core Auger line can be estimated for {el}.</p>;
  const main = [...t.levels].filter((l) => l.be < hv && l.be > 20).sort((a, b) => (crossSection(tf, b, hv) ?? 0) - (crossSection(tf, a, hv) ?? 0))[0];
  return (
    <>
    {table}
    {table && <h4>Estimated Auger lines</h4>}
    <Table
      head={["Auger line", "KE (eV)", `Apparent BE at hν = ${hv} eV`, main ? `α' = BE(${main.orb}) + KE` : "α'"]}
      rows={lines.map((a) => [`${el} ${a.name}`, a.ke.toFixed(0), hv - a.ke > 0 ? (hv - a.ke).toFixed(0) : "—", main ? (main.be + a.ke).toFixed(0) : "—"])}
      note={<>Estimated with the Chung–Jenkins Z+1 approximation from free-atom binding energies (Hofmann 2013, Eq. 3.11): expect ±5–10 eV against measured peaks. Auger kinetic energies do not move with hν; photoelectron peaks do, so changing the source separates overlaps. Modified Auger parameter α' = BE(photoelectron) + KE(Auger) is independent of charging; plot α' against BE (Wagner plot) to identify chemical states.</>}
    />
    </>
  );
}

function Edges({ ctx }: { ctx: Ctx }) {
  const { el, t, tf, hv } = ctx;
  const edges = t.levels.filter((l) => l.be >= 10 && /^[KLM]/.test(l.iupac)).sort((a, b) => b.be - a.be);
  const att = attenuationLength(tf, t, hv);
  return (
    <Table
      head={["Edge", "Level", "Energy (eV)", "Jump ratio", "Fluorescence yield"]}
      rows={edges.map((l) => [`${el} ${l.iupac}`, l.orb, f(l.be, 1), f(l.jump, 2), l.iupac in t.yield ? t.yield[l.iupac].toFixed(3) : "—"])}
      note={<>X-ray attenuation length of {el} at hν = {hv} eV: <b>{att == null ? "—" : att < 1 ? `${(att * 1000).toFixed(1)} nm` : `${att.toPrecision(3)} µm`}</b> (density {f(t.density, 2)} g/cm³). Edge energies and jump ratios from xraylib; for XAS/NEXAFS scan across the edge, for resonant PES tune hν to it.</>}
    />
  );
}

function Multiplets({ el }: { el: string }) {
  const sets = (MULTIPLETS as Multiplet[]).filter((m) => m.el === el);
  if (!sets.length) return <p className="muted">No published multiplet fitting parameters for {el}. Available: Sc, Ti, V, Cr, Mn, Fe, Co, Ni, Cu (Biesinger 2010, 2011).</p>;
  return (
    <>
      {sets.map((m, i) => (
        <div key={i}>
          <h4>{el} {m.line} – {m.compound} <span className="muted small">({m.source})</span></h4>
          <Table head={["Peak", "BE (eV)", "FWHM (eV)", "FWHM 20 eV PE", "% area"]}
            rows={m.peaks.map((p, j) => [p.label ?? `${j + 1}`, f(p.be, 2), f(p.fwhm, 2), f(p.fwhm20, 2), f(p.area, 1)])}
            note={m.note} />
        </div>
      ))}
      <p className="dt-note">Biesinger et al., Appl. Surf. Sci. 257 (2010) 887 and 257 (2011) 2717. Use the peak positions, widths and area ratios as linked constraints in KherveFitting. FWHM at 10 eV pass energy unless noted.</p>
    </>
  );
}

function Sputter({ el }: { el?: string }) {
  return (
    <Table head={["Target", "Yield, Ar⁺ 1 keV (atoms/ion)", "M/(nρ) (cm³/g-atom)", "Rate ratio to Ta₂O₅"]} rows={SPUTTER}
      highlight={(r) => !!el && (r[0] === el || String(r[0]).startsWith(el) && /\d|O/.test(String(r[0]).slice(el.length, el.length + 1)))}
      note="Ar⁺ at 1 keV and 45° incidence (Hofmann 2013, Table 7.1, after Seah and co-workers). Rate ratios in brackets from a second reference. Rows for the selected element are highlighted." />
  );
}

function WorkFunction({ el }: { el?: string }) {
  return (
    <Table head={["Material", "Work function (eV)"]} rows={WORK_FUNCTION}
      highlight={(r) => !!el && (r[0] === el || String(r[0]).startsWith(el) && /\d|O|S/.test(String(r[0]).slice(el.length, el.length + 1)))}
      note="Literature ranges depend on crystal face and surface cleanliness. Needed for UPS (secondary-electron cut-off) and for the spectrometer work function. Rows for the selected element are highlighted." />
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
