# Candidate tables for KherveDB

Found by scanning the PDFs in `OneDrive/Documents/MEGAsync/Papers/Books` (16 Oct 2026).
KherveDB today has: NIST XPS entries (`nist.bin`), per-element properties, main line,
reference URLs and an overlaps list (`elements.json`).

## Tier 1: per-element tables (one value per element or core level)

| Table | Source PDF | Page | Notes |
|---|---|---|---|
| Photoionisation cross sections (Al/Mg Kα) | `Scofield/Scofield.CrossSections.UCRL51326.pdf` | whole report | Scanned, no text layer: needs OCR or a digital copy (also in xraylib / the Elettra web tables). |
| Subshell cross sections + asymmetry parameters β, Z 1–103 | `Scofield/Yeh85.pdf` | Table I p13, Table II p18–20 | Has a text layer. Adds β for angle correction. |
| Electron IMFP / effective attenuation lengths | `Scofield/NISTNSRDS1642014.pdf` | throughout | NIST SRD 164; has a text layer. |
| IMFP equations (A, B coefficients) | `IMFP/… Seah 1979 …pdf` | Table 1 p4, Table 2 p9 | Small table; IMFP(E) can be computed for every line. |
| Reference binding energies | `Handbook of XPS_Phi.pdf` | Table 1 p16 | |
| Chemical-state tables | `Handbook of XPS_Phi.pdf` | Appendix 8 p214–241 | Compound / BE table, a second source next to NIST. |
| Mg/Al X-ray satellite and ghost-line offsets | `Handbook of XPS_Phi.pdf` p19 (Table 3); `Hofmann 2013` p38 (Table 2.2) | | Lets you mark satellite and ghost peaks on spectra. |
| Spin-orbit splitting (ΔE) and intensity ratios | `XPS/Book_Fitting.pdf` Table III p16; `van der Heide 2011` Table 5.2 p122; `Hofmann` Table 3.2 p65; `XPS/Book_Fitting_Polymer.pdf` Table VIII p16 | | Useful for the right-click popup and as KherveFitting doublet constraints. |
| Bulk plasmon energies | `van der Heide 2011` Table 5.4 p144 | | Marks loss features. |
| Relative sputter rates | `Handbook of XPS_Phi.pdf` Table 5 p28; `Hofmann` Table 7.1 p318 | | Ar⁺ sputter yields per element. |
| XPS ↔ X-ray notation | `XPS/Coster-Kronig effect.pdf` Table 2 p3; `Hofmann` Table 3.1 p62 | | Needed to join the XPS and EDS/XRF line names. |
| Sensitivity factors | `XPS/Book_Intro.pdf` Table IV p15; `Hofmann` Table 4.2 p138 | | Partial list; Scofield covers all elements. |
| Signal lookup by BE (survey ID) | `BE_Lookup_table.pdf` | 4 pages | All lines sorted by BE incl. Auger: an energy-search mode. |

## Tier 2: chemical-shift and reference tables

| Table | Source PDF | Page |
|---|---|---|
| C 1s primary/secondary shifts (O, N, halogen functions) | `XPS/Book_Fitting_C1s.pdf` | Tables VII–X p23–24 |
| Polymer C 1s reference BEs | `XPS/Book_Fitting_Polymer.pdf` | Table VI p13 |
| Organic polymers (Scienta ESCA300) | `Briggs & Beamson 1992` | scanned, needs OCR |
| Mineral spectra (BE per mineral) | `Kloprogge & Wood 2020` | text layer, no "Table" captions: needs a page-layout parse |
| Reference BE / Auger KE for calibration | `Hofmann` | Tables 8.2, 8.3 p438 |
| Cu 2p / Cu LMM / Auger parameter of Cu oxides | `van der Heide` | Table 6.9 p177 |
| Group 2A oxidation shifts; C 1s / O 1s of carbonates/oxides | `van der Heide` | Tables 5.3, 6.1, 6.2 |
| Ta oxide BEs | `Hofmann` | Table 9.4 p488 |
| Fe 2p3/2 literature positions | `Wagner 2011` | Table 1 p207 |

## Not suitable (scanned or no tables found)
- `Handbook_of_XPS_Perkin_Elmer_Co_1979.pdf`, `Ref-Phi.pdf`: image-only, would need OCR.
- Springer textbooks and theses: no element-level reference data.

## Copyright
Handbook values (PHI, Perkin-Elmer, Briggs, Kloprogge) are copyrighted compilations:
use them as cited references or links, not bulk-copied data. Freely reusable:
NIST SRD 128 / 164, Scofield (LLNL report), Yeh & Lindau tables (cite), xraylib (BSD).

## Already downloaded
- `nist_xray_transitions.tsv`: NIST SRD 128 X-ray transition energies, Ne–Fm, K and L lines.
