// Reference tables shown in the tabs next to the NIST results.
// Per-element data (tables.bin) is built by scripts/build_tables.py from
// xraylib and NIST SRD 128; the small fixed tables below are from the
// handbooks cited on each one.

export type Level = {
  orb: string; iupac: string; be: number;
  /** Partial cross section (barns/atom) on TablesFile.grid; beta on TablesFile.trzE */
  xs?: (number | null)[]; beta?: number[]; jump?: number;
  keAl?: number; csAl?: number | null; imfpAl?: number | null;
  keMg?: number; csMg?: number | null; imfpMg?: number | null;
};
export type XLine = { name: string; iupac: string; keV: number; rate: number | null; nistTh: number | null; nistExp: number | null };
export type ElTables = {
  z: number; density: number | null; mass: number; levels: Level[]; xray: XLine[]; yield: Record<string, number>;
  /** Total attenuation coefficient (cm²/g) on TablesFile.grid */
  mu?: (number | null)[];
};
export type TablesFile = { version: number; source: string; grid: number[]; trzE: number[]; elements: Record<string, ElTables> };

// ---- Photon sources ----
export type PhotonSource = { id: string; label: string; hv: number };
export const PHOTON_SOURCES: PhotonSource[] = [
  { id: "al", label: "Al Kα (1486.6 eV)", hv: 1486.6 },
  { id: "mg", label: "Mg Kα (1253.6 eV)", hv: 1253.6 },
  { id: "ag", label: "Ag Lα (2984.3 eV, HAXPES)", hv: 2984.3 },
  { id: "cr", label: "Cr Kα (5414.8 eV, HAXPES)", hv: 5414.8 },
  { id: "ga", label: "Ga Kα (9251.7 eV, HAXPES)", hv: 9251.7 },
  { id: "zr", label: "Zr Mζ (151.4 eV)", hv: 151.4 },
  { id: "y", label: "Y Mζ (132.3 eV)", hv: 132.3 },
  { id: "he2", label: "He II (40.81 eV, UPS)", hv: 40.81 },
  { id: "he1", label: "He I (21.22 eV, UPS)", hv: 21.22 },
  { id: "custom", label: "Synchrotron / custom…", hv: 1000 },
];

/** Log-log interpolation of y(x) on an increasing grid; null outside or across gaps. */
export function interp(grid: number[], ys: (number | null)[] | undefined, x: number, log = true): number | null {
  if (!ys || x < grid[0] || x > grid[grid.length - 1]) return null;
  let i = 0;
  while (i < grid.length - 2 && grid[i + 1] < x) i++;
  const a = ys[i], b = ys[i + 1];
  if (a == null || b == null) return b != null && x >= grid[i + 1] * 0.999 ? b : null;
  if (!log || a <= 0 || b <= 0) return a + ((b - a) * (x - grid[i])) / (grid[i + 1] - grid[i]);
  const f = Math.log(x / grid[i]) / Math.log(grid[i + 1] / grid[i]);
  return Math.exp(Math.log(a) + f * Math.log(b / a));
}

/** Cross section (barns) of a level at photon energy hv (eV). */
export const crossSection = (tf: TablesFile, l: Level, hv: number) => (hv > l.be ? interp(tf.grid, l.xs, hv / 1000) : null);

/** Dipole asymmetry parameter beta at hv (eV), Trzhaskovskaya 1.5-10 keV; nearest end within 15 %. */
export function asymmetry(tf: TablesFile, l: Level, hv: number): number | null {
  if (!l.beta) return null;
  const k = hv / 1000, e = tf.trzE;
  if (k < e[0] * 0.85 || k > e[e.length - 1] * 1.15) return null;
  return interp(e, l.beta, Math.min(Math.max(k, e[0]), e[e.length - 1]), false);
}

/** Attenuation length (µm) of photons of energy hv (eV) in the element. */
export function attenuationLength(tf: TablesFile, t: ElTables, hv: number): number | null {
  const mu = interp(tf.grid, t.mu, hv / 1000);
  return mu && t.density ? 1e4 / (mu * t.density) : null;
}

// ---- TPP-2M inelastic mean free path (Tanuma, Powell & Penn, SIA 21 (1994) 165) ----
const BAND_GAP: Record<string, number> = { B: 1.5, Si: 1.12, Ge: 0.67, Se: 1.7, Te: 0.33, P: 1.5, S: 2.6, I: 1.3, As: 1.2 };
/** Valence electrons per atom as used by Tanuma et al.: s+d for transition metals, s+p otherwise. */
export function valenceElectrons(col: number, cat: string, z: number): number {
  if (cat === "lanthanide" || cat === "actinide") return 3;
  if (z <= 2) return z;
  return col <= 12 ? col : col - 10;
}
export function imfpTPP2M(el: string, t: ElTables, nv: number, ke: number): number | null {
  const rho = t.density;
  if (!rho || ke < 50) return null;
  const eg = BAND_GAP[el] ?? 0;
  const ep = 28.816 * Math.sqrt((nv * rho) / t.mass);
  const u = (nv * rho) / t.mass;
  const beta = -0.1 + 0.944 / Math.sqrt(ep * ep + eg * eg) + 0.069 * rho ** 0.1;
  const gamma = 0.191 / Math.sqrt(rho);
  const c = 1.97 - 0.91 * u, d = 53.4 - 20.8 * u;
  const lambdaA = ke / (ep * ep * (beta * Math.log(gamma * ke) - c / ke + d / (ke * ke)));
  return lambdaA > 0 ? lambdaA / 10 : null;
}

// ---- Auger lines (Chung & Jenkins Z+1 approximation; Hofmann 2013, Eq. 3.11) ----
const AUGER_SERIES: [string, string, string, string][] = [
  ["KL2,3L2,3", "1s", "2p3/2", "2p3/2"],
  ["L3M2,3M2,3", "2p3/2", "3p3/2", "3p3/2"],
  ["L3M4,5M4,5", "2p3/2", "3d5/2", "3d5/2"],
  ["M5N4,5N4,5", "3d5/2", "4d5/2", "4d5/2"],
  ["M5N6,7N6,7", "3d5/2", "4f7/2", "4f7/2"],
  ["N7O4,5O4,5", "4f7/2", "5d5/2", "5d5/2"],
];
export type AugerLine = { name: string; ke: number };
export function augerLines(t: ElTables, next: ElTables | undefined): AugerLine[] {
  const be = (x: ElTables | undefined, o: string) => x?.levels.find((l) => l.orb === o)?.be;
  const out: AugerLine[] = [];
  for (const [name, a, b, c] of AUGER_SERIES) {
    const ea = be(t, a), eb = be(t, b), ec = be(t, c);
    if (ea == null || eb == null || ec == null || ea < 50) continue;
    const eb1 = be(next, b) ?? eb, ec1 = be(next, c) ?? ec;
    const ke = ea - (eb + eb1) / 2 - (ec + ec1) / 2;
    if (ke > 20) out.push({ name, ke });
  }
  return out;
}

// ---- Sputtering yields, Ar+ 1 keV, 45° (Hofmann 2013, Table 7.1) ----
// [element or oxide, yield (atoms/ion), M/(n rho) (cm³/g-atom), rate ratio to Ta2O5]
export const SPUTTER: [string, string, string, string][] = [
  ["C", "0.98", "5.21", "0.31"], ["Mg", "4.90", "14.0", "4.5"], ["Al", "2.71", "10.0", "1.8"],
  ["Si", "1.63", "12.0", "1.3"], ["Ti", "1.55", "10.55", "1.1"], ["Cr", "2.77", "7.23", "1.3"],
  ["Fe", "2.81", "7.08", "1.3"], ["Co", "3.00", "6.62", "1.3"], ["Ni", "3.08", "6.60", "1.3"],
  ["Cu", "4.00", "7.09", "1.9"], ["Ga", "3.57", "11.43", "2.7"], ["Ge", "2.32", "13.65", "2.1"],
  ["As", "10.0", "13.07", "8.6"], ["Nb", "1.65", "10.48", "1.2"], ["Mo", "2.15", "9.39", "1.3"],
  ["Pd", "4.62", "8.87", "2.7"], ["Ag", "5.77", "10.27", "3.9"], ["In", "4.56", "15.70", "4.7"],
  ["Hf", "1.75", "13.40", "1.5"], ["Ta", "1.60", "10.87", "1.1"], ["W", "1.62", "9.53", "1.0"],
  ["Pt", "2.80", "9.10", "1.7"], ["Au", "4.19", "10.21", "2.8"], ["Pb", "4.94", "18.23", "5.9"],
  ["Bi", "5.39", "21.43", "7.5"],
  ["Al2O3", "1.8", "5.13", "0.62 (0.57)"], ["SiO2", "2.7", "7.58", "1.35"], ["TiO2", "1.8", "6.30", "0.73"],
  ["Cr2O3", "2.0", "5.83", "0.72 (0.72)"], ["Fe2O3", "2.0", "6.10", "0.82 (0.82)"], ["Fe3O4", "2.5", "6.39", "(1.03)"],
  ["ZnO", "3.0", "7.25", "1.41"], ["CeO2", "1.4", "7.50", "0.70"], ["HfO2", "1.5", "7.25", "0.72"],
  ["ITO", "2.54", "7.68", "1.41"], ["Ta2O5", "1.97", "7.70", "1.00"],
];

// ---- Work functions (eV), compiled table in Papers/Books/Work_function.pdf ----
export const WORK_FUNCTION: [string, string][] = [
  ["BaO", "1.10"], ["(Ba,Sr)CO3", "1.25"], ["SrO", "1.27"], ["CaO", "1.60 ± 0.20"], ["Y2O3", "2.00"],
  ["Gd2O3", "2.10"], ["Tb2O3", "2.10"], ["Dy2O3", "2.10"], ["Ho2O3", "2.10"], ["Nd2O3", "2.30"],
  ["Er2O3", "2.40"], ["ThO2", "2.54"], ["Eu2O3", "2.60"], ["La2O3", "2.80"], ["Pr6O11", "2.80"],
  ["Sm2O3", "2.80"], ["UO2", "3.15"], ["CeO2", "3.21"], ["U", "3.63 – 3.90"], ["BeO", "3.80 – 4.70"],
  ["FeS2", "3.8"], ["FeO", "3.85"], ["Graphite", "4.00"], ["Al", "4.06 – 4.41"], ["MoO3", "4.25"],
  ["Pb", "4.25"], ["Ag", "4.26 – 4.74"], ["Hg", "4.49"], ["Fe", "4.50 – 4.81"], ["Cu", "4.53 – 4.94"],
  ["Al2O3", "4.70"], ["MgO", "4.70"], ["Si", "4.85"], ["SiO2", "5.00"], ["Co", "5.00"], ["Ni", "5.04 – 5.15"],
  ["Au", "5.10 – 5.47"], ["Pt", "5.70"], ["ZrO2", "5.80"], ["TiO2", "6.21"],
];

export async function loadTables(): Promise<TablesFile> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/tables.bin`);
  if (!res.ok) throw new Error(`tables.bin: ${res.status}`);
  const stream = res.body!.pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text()) as TablesFile;
}

// ---- X-ray source satellites (Hofmann 2013, Table 2.2; Krause & Ferreira 1975) ----
// Satellites appear at LOWER binding energy than the parent peak by `shift`.
export const SATELLITES: { line: string; mg: [number, number]; al: [number, number] }[] = [
  { line: "Kα3", mg: [8.4, 8.0], al: [9.8, 6.4] },
  { line: "Kα4", mg: [10.2, 4.1], al: [11.8, 3.2] },
  { line: "Kα5", mg: [17.5, 0.55], al: [20.1, 0.4] },
  { line: "Kα6", mg: [20.0, 0.45], al: [23.4, 0.3] },
  { line: "Kβ", mg: [48.5, 0.5], al: [69.7, 0.55] },
];

// ---- X-ray ghost lines (PHI Handbook of XPS, Table 3) ----
// Apparent BE = true BE + shift.
export const GHOSTS: { from: string; mg: number; al: number }[] = [
  { from: "O Kα", mg: 728.7, al: 961.7 },
  { from: "Cu Lα", mg: 323.9, al: 556.9 },
  { from: "Mg Kα (in Al anode)", mg: NaN, al: 233.0 },
  { from: "Al Kα (in Mg anode)", mg: -233.0, al: NaN },
];

// ---- Energy-scale calibration (ISO 15472; Hofmann 2013, Tables 8.2-8.3) ----
export const CALIBRATION_BE: [string, string, string, string][] = [
  ["Au 4f7/2", "83.95", "83.95", "83.96"],
  ["Ag 3d5/2", "368.26", "368.26", "368.21"],
  ["Cu L3VV (Auger)", "567.93", "567.93", "—"],
  ["Cu 2p3/2", "932.63", "932.63", "932.63"],
];
export const CALIBRATION_KE: [string, string, string][] = [
  ["Cu M2,3VV", "62", "64"],
  ["Ag M4N4,5N4,5", "356", "—"],
  ["Cu L3VV", "919", "920"],
  ["Al KL2,3L2,3", "1393", "1395"],
  ["Au M5N6,7N6,7", "2016", "2026"],
];

// ---- C 1s chemical shifts (Biesinger, Appl. Surf. Sci. 597 (2022) 153681; Beamson & Briggs 1992) ----
export const C1S_SHIFTS: [string, string, string][] = [
  ["C–C / C–H (adventitious)", "284.8", "reference"],
  ["C=C sp² (graphite)", "284.4", "−0.4"],
  ["C–N (amine)", "285.8", "+1.0"],
  ["C–O (alcohol, ether)", "286.3", "+1.5"],
  ["C–Cl", "286.5", "+1.7"],
  ["C=O (ketone, aldehyde)", "287.8", "+3.0"],
  ["O–C–O (acetal)", "287.8", "+3.0"],
  ["N–C=O (amide)", "288.0", "+3.2"],
  ["O–C=O (acid, ester)", "289.0", "+4.2"],
  ["CHF / C–F", "288.5", "+3.7"],
  ["CO₃ (carbonate)", "290.0", "+5.2"],
  ["π–π* shake-up (aromatic)", "291.0", "+6.2"],
  ["CF₂", "291.5", "+6.7"],
  ["CF₃", "293.5", "+8.7"],
];

// ---- XPS ↔ X-ray notation (Coster-Kronig paper, Table 2; Hofmann Table 3.1) ----
export const NOTATION: [string, string][] = [
  ["1s", "K"], ["2s", "L1"], ["2p1/2", "L2"], ["2p3/2", "L3"],
  ["3s", "M1"], ["3p1/2", "M2"], ["3p3/2", "M3"], ["3d3/2", "M4"], ["3d5/2", "M5"],
  ["4s", "N1"], ["4p1/2", "N2"], ["4p3/2", "N3"], ["4d3/2", "N4"], ["4d5/2", "N5"], ["4f5/2", "N6"], ["4f7/2", "N7"],
  ["5s", "O1"], ["5p1/2", "O2"], ["5p3/2", "O3"], ["5d3/2", "O4"], ["5d5/2", "O5"],
];

// ---- Free-electron bulk plasmon (van der Heide 2011, Eq. 4.1b and Table 5.4) ----
// Valence electrons used for s/p elements; transition metals are left out on purpose.
const NV: Record<string, number> = {
  Li: 1, Na: 1, K: 1, Rb: 1, Cs: 1, Be: 2, Mg: 2, Ca: 2, Sr: 2, Ba: 2,
  B: 3, Al: 3, Ga: 3, In: 3, Tl: 3, C: 4, Si: 4, Ge: 4, Sn: 4, Pb: 4,
  P: 5, As: 5, Sb: 5, Bi: 5, Zn: 2, Cd: 2, Hg: 2,
};
export function plasmon(el: string, t: ElTables): { nv: number; bulk: number; surface: number } | null {
  const nv = NV[el];
  if (!nv || !t.density) return null;
  const bulk = 28.82 * Math.sqrt((nv * t.density) / t.mass);
  return { nv, bulk, surface: bulk / Math.SQRT2 };
}

// ---- Spin-orbit doublets ----
export const DOUBLETS: [string, string, number][] = [
  ["2p3/2", "2p1/2", 2], ["3p3/2", "3p1/2", 2], ["4p3/2", "4p1/2", 2], ["5p3/2", "5p1/2", 2],
  ["3d5/2", "3d3/2", 1.5], ["4d5/2", "4d3/2", 1.5], ["5d5/2", "5d3/2", 1.5], ["4f7/2", "4f5/2", 4 / 3],
];
