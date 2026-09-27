import { useEffect, useRef, useState, type ReactNode } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { ElementInfo, ElementsFile, NistDb } from "./data";

/** Small draggable-free floating window, closed with Esc or ×. */
export function FloatingWindow({
  title, x, y, onClose, children, wide,
}: { title: string; x?: number; y?: number; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Place near the mouse (or centred), kept on screen; re-placed when the content changes size
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const place = () => {
      const w = el.offsetWidth, h = el.offsetHeight;
      const left = x == null ? (window.innerWidth - w) / 2 : Math.min(x + 12, window.innerWidth - w - 8);
      const top = y == null ? (window.innerHeight - h) / 2 : Math.min(y + 12, window.innerHeight - h - 8);
      setPos({ left: Math.max(8, left), top: Math.max(8, top) });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [x, y]);

  return (
    <div
      ref={ref}
      className={`floating${wide ? " wide" : ""}`}
      style={pos ?? { visibility: "hidden" }}
      role="dialog"
      aria-label={title}
    >
      <div className="floating-title">
        <span>{title}</span>
        <button onClick={onClose} aria-label="Close" title="Close (Esc)">×</button>
      </div>
      <div className="floating-body">{children}</div>
    </div>
  );
}

export function InfoContent({ el, meta, info }: { el: string; meta: ElementsFile; info: ElementInfo }) {
  const m = meta.elements[el];
  const p = m.props;
  return (
    <div className="info">
      <div className="info-head">
        <span className={`info-sym cat-${m.cat}`}>{el}</span>
        <div>
          <div className="info-name">{String(p.Name ?? el)}</div>
          <div className="muted">Z = {m.z} · {String(p.Category ?? m.cat)}</div>
        </div>
      </div>
      <dl>
        {p["Electron Configuration"] && (<><dt>Electron configuration</dt><dd>{String(p["Electron Configuration"])}</dd></>)}
        {p["Ground State"] && (<><dt>Ground state</dt><dd>{String(p["Ground State"])}</dd></>)}
        {info.mainLine && (<><dt>Main XPS line</dt><dd>{el} {info.mainLine}</dd></>)}
      </dl>
      {info.peaks.length > 0 ? (
        <>
          <h4>XPS peak positions <span className="muted">(NIST median, 5–95 % range)</span></h4>
          <table className="peaks">
            <thead><tr><th>Line</th><th>BE (eV)</th><th>Range</th><th>n</th></tr></thead>
            <tbody>
              {info.peaks.map((s) => (
                <tr key={s.line}>
                  <td>{s.line}</td>
                  <td className="num">{s.median.toFixed(1)}</td>
                  <td className="num">{s.count > 1 ? `${s.lo.toFixed(1)}–${s.hi.toFixed(1)}` : "single"}</td>
                  <td className="num">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p>No XPS data in the NIST database for this element.</p>
      )}
      {info.spinOrbit.length > 0 && <p><b>Spin–orbit splitting:</b> {info.spinOrbit.join(", ")}</p>}
      {info.known && <p><b>Common overlaps:</b> {info.known}</p>}
      {info.mainLine && (
        <p>
          <b>NIST lines within ±5 eV of {info.mainLine}:</b>{" "}
          {info.nearby.length
            ? info.nearby.map((s) => `${s.el} ${s.line} (${s.median.toFixed(1)})`).join(", ")
            : "none"}
        </p>
      )}
    </div>
  );
}

export function RowDetails({ db, row }: { db: NistDb; row: number }) {
  return (
    <table className="details">
      <tbody>
        {db.columns.map((c) => {
          const v = db.value(c, row);
          return v ? (<tr key={c}><th>{c}</th><td>{v}</td></tr>) : null;
        })}
      </tbody>
    </table>
  );
}

/** Histogram of binding energies, BE axis reversed as usual in XPS. */
export function BePlot({ db, rows, title }: { db: NistDb; rows: number[]; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const vals = rows.map((r) => db.be[r]).filter((v) => !Number.isNaN(v));
    if (!ref.current || !vals.length) return;
    const min = Math.min(...vals), max = Math.max(...vals);
    const bin = Math.max(0.1, Math.round(((max - min) / 60) * 10) / 10);
    const start = Math.floor(min / bin) * bin;
    const n = Math.floor((max - start) / bin) + 1;
    const counts = new Array(n).fill(0);
    for (const v of vals) counts[Math.floor((v - start) / bin)]++;
    const xs = counts.map((_, i) => start + (i + 0.5) * bin);
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue("--accent").trim() || "#1e5aaa";
    const text = css.getPropertyValue("--text").trim() || "#222";
    const grid = css.getPropertyValue("--border").trim() || "#ddd";
    const axis = { stroke: text, grid: { stroke: grid, width: 1 }, ticks: { stroke: grid } };
    const plot = new uPlot(
      {
        width: ref.current.clientWidth,
        height: 320,
        scales: { x: { time: false, dir: -1 } },
        legend: { show: false },
        cursor: { drag: { x: true, y: false } },
        axes: [{ ...axis, label: "Binding energy (eV)" }, { ...axis, label: "Entries" }],
        series: [
          {},
          { label: "Entries", stroke: accent, fill: accent + "88", paths: uPlot.paths.bars!({ size: [0.9, 100] }) },
        ],
      },
      [xs, counts],
      ref.current,
    );
    return () => plot.destroy();
  }, [db, rows]);
  return (
    <div>
      <p className="muted">{title} · {rows.length} entries · drag to zoom, double-click to reset</p>
      <div ref={ref} className="plot" />
    </div>
  );
}
