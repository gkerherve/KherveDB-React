import { useMemo, useState } from "react";
import type { NistDb } from "./data";

const ROW_H = 26;
const OVERSCAN = 10;

type Col = { key: "element" | "line" | "be" | "formula" | "name" | "journal"; label: string; width: string };
const COLS: Col[] = [
  { key: "element", label: "El.", width: "44px" },
  { key: "line", label: "Line", width: "70px" },
  { key: "be", label: "BE (eV)", width: "76px" },
  { key: "formula", label: "Formula", width: "minmax(90px, 1fr)" },
  { key: "name", label: "Name", width: "minmax(120px, 1.6fr)" },
  { key: "journal", label: "Journal", width: "minmax(120px, 1.6fr)" },
];
const TEMPLATE = COLS.map((c) => c.width).join(" ");

type Props = { db: NistDb; rows: number[]; onRowClick: (row: number) => void };

export default function ResultsTable({ db, rows, onRowClick }: Props) {
  const [sort, setSort] = useState<{ key: Col["key"]; dir: 1 | -1 }>({ key: "be", dir: 1 });
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(400);

  const sorted = useMemo(() => {
    const out = rows.slice();
    const { key, dir } = sort;
    if (key === "be") out.sort((a, b) => dir * (db.be[a] - db.be[b]));
    else {
      const arr = db[key];
      out.sort((a, b) => dir * arr[a].localeCompare(arr[b]));
    }
    return out;
  }, [db, rows, sort]);

  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const last = Math.min(sorted.length, Math.ceil((scrollTop + height) / ROW_H) + OVERSCAN);

  const clickHeader = (key: Col["key"]) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  return (
    <div className="results">
      <div className="thead" style={{ gridTemplateColumns: TEMPLATE }}>
        {COLS.map((c) => (
          <button key={c.key} onClick={() => clickHeader(c.key)} title={`Sort by ${c.label}`}>
            {c.label}
            {sort.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
          </button>
        ))}
      </div>
      <div
        className="tbody"
        ref={(el) => {
          if (el && el.clientHeight !== height) setHeight(el.clientHeight);
        }}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <div style={{ height: sorted.length * ROW_H, position: "relative" }}>
          {sorted.slice(first, last).map((r, i) => (
            <div
              key={r}
              className="trow"
              style={{ top: (first + i) * ROW_H, height: ROW_H, gridTemplateColumns: TEMPLATE }}
              onClick={() => onRowClick(r)}
              title="Click for all details of this entry"
            >
              <span>{db.element[r]}</span>
              <span>{db.line[r]}</span>
              <span className="num">{Number.isNaN(db.be[r]) ? "" : db.be[r].toFixed(2)}</span>
              <span>{db.formula[r]}</span>
              <span>{db.name[r]}</span>
              <span>{db.journal[r]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="status">{rows.length.toLocaleString()} results found</div>
    </div>
  );
}
