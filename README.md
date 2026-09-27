# KherveDB (React)

Prototype of KherveDB rewritten in React: the NIST X-ray Photoelectron Spectroscopy
binding-energy database (recorded in 2019) with a periodic-table browser.

One code base, two targets:

- **Web** – static site (`npm run build` → `dist/`), deployable to GitHub Pages.
- **Desktop** – [Tauri](https://tauri.app) app using the WebView2 built into Windows,
  so the installer stays a few MB instead of hundreds.

## Use

- Click an element: its NIST entries appear in the table (filter by line, formula, name).
- Right-click an element: electronic structure, XPS peak positions, spin-orbit splitting, overlaps.
- Double-click, or **Other Databases & Properties**: XPS Fitting, Harwell XPS Guru, Thermo Knowledge,
  Surface Science Spectra and electronic-structure searches on Google Scholar.
  On the desktop these open in their own window with cookie banners declined; on the web in a new tab.
- Click a result row for every detail of that entry; **Plot results** for the BE distribution.

## Develop

```bash
npm install
npm run dev          # web, http://localhost:5173
npx tauri dev        # desktop (needs Rust)
npx tauri build      # installer in src-tauri/target/release/bundle/nsis
```

## Data

`public/data/nist.bin` is the NIST database as gzip-compressed, column-oriented JSON
(dictionary-encoded strings, ~0.9 MB), decompressed in the browser with `DecompressionStream`.
`public/data/elements.json` holds element properties and reference URLs.
Both are exported from the Python KherveDB (`NIST_BE.parquet` and `Main.py`).

Developer: Gwilherm Kerherve
