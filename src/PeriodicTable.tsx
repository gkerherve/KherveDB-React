import { memo } from "react";
import type { ElementsFile } from "./data";

type Props = {
  meta: ElementsFile;
  withData: Set<string>;
  selected: string | null;
  onSelect: (el: string) => void;
  onOpen: (el: string) => void;
  onInfo: (el: string, x: number, y: number) => void;
};

function PeriodicTable({ meta, withData, selected, onSelect, onOpen, onInfo }: Props) {
  const entries = Object.entries(meta.elements);
  return (
    <div className="ptable" role="grid" aria-label="Periodic table">
      {entries.map(([el, m]) => {
        const enabled = withData.has(el);
        return (
          <button
            key={el}
            className={`tile cat-${m.cat}${selected === el ? " selected" : ""}`}
            style={{ gridRow: m.row + 1, gridColumn: m.col + 1 }}
            disabled={!enabled}
            title={
              enabled
                ? `${m.props.Name ?? el}: click to show NIST entries, double-click for Other Databases & Properties,\nright-click for electronic structure, XPS peak positions and overlaps`
                : `${m.props.Name ?? el}: no entries in the NIST database`
            }
            onClick={() => onSelect(el)}
            onDoubleClick={() => onOpen(el)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (enabled) onInfo(el, e.clientX, e.clientY);
            }}
          >
            <span className="z">{m.z}</span>
            <span className="be">{m.be}</span>
            <span className="sym">{el}</span>
            <span className="line">{m.main}</span>
          </button>
        );
      })}
      <span className="marker" style={{ gridRow: 6, gridColumn: 3 }}>*</span>
      <span className="marker" style={{ gridRow: 7, gridColumn: 3 }}>**</span>
      <span className="marker" style={{ gridRow: 9, gridColumn: 2 }}>*</span>
      <span className="marker" style={{ gridRow: 10, gridColumn: 2 }}>**</span>
    </div>
  );
}

export default memo(PeriodicTable);
