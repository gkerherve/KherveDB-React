// Reference tables shown in the tabs next to the NIST results.
// Per-element data (tables.bin) is built by scripts/build_tables.py from
// xraylib and NIST SRD 128; the small fixed tables below are from the
// handbooks cited on each one.

export type Level = {
  orb: string; iupac: string; be: number;
  keAl?: number; csAl?: number | null; imfpAl?: number | null;
  keMg?: number; csMg?: number | null; imfpMg?: number | null;
};
export type XLine = { name: string; iupac: string; keV: number; rate: number | null; nistTh: number | null; nistExp: number | null };
export type ElTables = { z: number; density: number | null; mass: number; levels: Level[]; xray: XLine[]; yield: Record<string, number> };
export type TablesFile = { version: number; source: string; elements: Record<string, ElTables> };

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
