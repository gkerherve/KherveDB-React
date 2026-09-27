// Loading and querying the NIST XPS binding-energy database.
// nist.bin is gzip-compressed, column-oriented JSON with dictionary-encoded strings.

type StrCol = { dict: string[]; idx: number[] };
type NumCol = { num: (number | null)[] };
type RawDb = { n: number; columns: string[]; cols: Record<string, StrCol | NumCol> };

export type ElementMeta = {
  row: number;
  col: number;
  cat: string;
  z: number;
  main: string;
  be: string;
  props: Record<string, string | number>;
  urls: { xpsfitting: string; harwell: string; thermo: string };
};

export type ElementsFile = {
  elements: Record<string, ElementMeta>;
  overlaps: Record<string, string>;
};

export class NistDb {
  readonly n: number;
  readonly columns: string[];
  private cols: Record<string, StrCol | NumCol>;
  readonly element: string[];
  readonly line: string[];
  readonly be: Float64Array;
  readonly formula: string[];
  readonly name: string[];
  readonly journal: string[];
  private formulaLower: string[];
  private nameLower: string[];

  constructor(raw: RawDb) {
    this.n = raw.n;
    this.columns = raw.columns;
    this.cols = raw.cols;
    this.element = this.strings("Element");
    this.line = this.strings("Line");
    this.formula = this.strings("Formula");
    this.name = this.strings("Name");
    this.journal = this.strings("Journal");
    const b = (raw.cols["BE (eV)"] as NumCol).num;
    this.be = Float64Array.from(b, (v) => (v == null ? NaN : v));
    this.formulaLower = this.formula.map((s) => s.toLowerCase());
    this.nameLower = this.name.map((s) => s.toLowerCase());
  }

  private strings(col: string): string[] {
    const c = this.cols[col] as StrCol;
    return c.idx.map((i) => (i < 0 ? "" : c.dict[i]));
  }

  /** Any column value for one row, for the details view. */
  value(col: string, row: number): string {
    const c = this.cols[col];
    if ("dict" in c) {
      const i = c.idx[row];
      return i < 0 ? "" : String(c.dict[i]);
    }
    const v = c.num[row];
    return v == null ? "" : String(v);
  }

  elementsWithData(): Set<string> {
    return new Set(this.element);
  }

  linesFor(el: string): string[] {
    const s = new Set<string>();
    for (let i = 0; i < this.n; i++) if (this.element[i] === el) s.add(this.line[i]);
    return [...s].sort();
  }

  filter(el: string | null, line: string, formula: string, name: string): number[] {
    const f = formula.trim().toLowerCase();
    const nm = name.trim().toLowerCase();
    const out: number[] = [];
    for (let i = 0; i < this.n; i++) {
      if (el && this.element[i] !== el) continue;
      if (line && this.line[i] !== line) continue;
      if (f && !this.formulaLower[i].includes(f)) continue;
      if (nm && !this.nameLower[i].includes(nm)) continue;
      out.push(i);
    }
    return out;
  }
}

async function gunzipJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const stream = res.body!.pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text()) as T;
}

export async function loadAll(): Promise<{ db: NistDb; meta: ElementsFile }> {
  const base = import.meta.env.BASE_URL;
  const [raw, meta] = await Promise.all([
    gunzipJson<RawDb>(`${base}data/nist.bin`),
    fetch(`${base}data/elements.json`).then((r) => r.json() as Promise<ElementsFile>),
  ]);
  return { db: new NistDb(raw), meta };
}

// ---- Per element/line statistics used by the info window ----

export type LineStat = { el: string; line: string; median: number; lo: number; hi: number; count: number };

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const i = Math.floor(pos);
  const frac = pos - i;
  return i + 1 < sorted.length ? sorted[i] + frac * (sorted[i + 1] - sorted[i]) : sorted[i];
}

/** Median and 5-95 % range per element and line, satellites excluded. */
export function lineStats(db: NistDb): LineStat[] {
  const groups = new Map<string, number[]>();
  for (let i = 0; i < db.n; i++) {
    const line = db.line[i];
    if (line.includes("sat") || Number.isNaN(db.be[i])) continue;
    const key = db.element[i] + "|" + line;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = []));
    g.push(db.be[i]);
  }
  const out: LineStat[] = [];
  for (const [key, vals] of groups) {
    vals.sort((a, b) => a - b);
    const [el, line] = key.split("|");
    out.push({
      el, line,
      median: quantile(vals, 0.5),
      lo: quantile(vals, 0.05),
      hi: quantile(vals, 0.95),
      count: vals.length,
    });
  }
  return out;
}

const SPIN_ORBIT: [string, string][] = [
  ["2p3/2", "2p1/2"], ["3p3/2", "3p1/2"], ["4p3/2", "4p1/2"], ["5p3/2", "5p1/2"],
  ["3d5/2", "3d3/2"], ["4d5/2", "4d3/2"], ["5d5/2", "5d3/2"], ["4f7/2", "4f5/2"],
];

export type ElementInfo = {
  mainLine: string | null;
  peaks: LineStat[];
  spinOrbit: string[];
  known: string | null;
  nearby: LineStat[];
};

export function elementInfo(el: string, meta: ElementsFile, stats: LineStat[]): ElementInfo {
  const mine = stats.filter((s) => s.el === el).sort((a, b) => b.count - a.count);
  const known = meta.overlaps[el] ?? null;
  if (!mine.length) return { mainLine: null, peaks: [], spinOrbit: [], known, nearby: [] };

  const lines = new Set(mine.map((s) => s.line));
  const mainLine = lines.has(meta.elements[el]?.main) ? meta.elements[el].main : mine[0].line;
  const byLine = new Map(mine.map((s) => [s.line, s]));
  const spinOrbit = SPIN_ORBIT.flatMap(([hi, lo]) => {
    const a = byLine.get(hi), b = byLine.get(lo);
    return a && b && a.count >= 2 && b.count >= 2 ? [`${hi.slice(0, 2)} ${(b.median - a.median).toFixed(1)} eV`] : [];
  });

  const be = byLine.get(mainLine)!.median;
  const seen = new Set<string>();
  const nearby = stats
    .filter((s) => s.el !== el && s.count >= 2 && Math.abs(s.median - be) <= 5)
    .sort((a, b) => Math.abs(a.median - be) - Math.abs(b.median - be))
    .filter((s) => (seen.has(s.el) ? false : (seen.add(s.el), true)))
    .slice(0, 6);

  const peaks = mine.slice(0, 6).sort((a, b) => b.median - a.median);
  return { mainLine, peaks, spinOrbit, known, nearby };
}
