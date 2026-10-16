"""Build public/data/tables.bin: the per-element reference tables shown in the
tabs under the NIST results (core levels, cross sections, IMFP, X-ray lines).

Sources
  - xraylib 4.x (BSD): binding energies (edge energies), X-ray line energies,
    radiative rates, fluorescence yields, partial photoionisation cross sections,
    densities and atomic weights.
  - NIST SRD 128 X-ray transition energies (data-sources/nist_xray_transitions.tsv):
    measured ("Direct") and theoretical K and L line energies.
  - Seah & Dench, Surf. Interface Anal. 1 (1979) 2: IMFP for elements,
    lambda = 538/E^2 + 0.41 (a E)^0.5 monolayers.
  - Trzhaskovskaya & Yarzhemsky Dirac-Fock asymmetry parameters (beta) at
    1.5-10 keV, digitised by Cant et al. on figshare (CC BY 4.0), in
    data-sources/trzhaskovskaya/ (one CSV per element).

Run:  python scripts/build_tables.py   (needs `pip install xraylib`)
"""
import csv
import gzip
import json
import math
import os

import xraylib as xr

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "public", "data", "tables.bin")
NIST_TSV = os.path.join(ROOT, "data-sources", "nist_xray_transitions.tsv")
TRZ_DIR = os.path.join(ROOT, "data-sources", "trzhaskovskaya")

# Photon-energy grid (keV) for cross sections and attenuation, log-spaced 30 eV - 15 keV
GRID = [round(0.03 * (15 / 0.03) ** (i / 59), 5) for i in range(60)]
TRZ_E = [1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10]

AL_KA, MG_KA = 1486.6, 1253.6  # eV
NA = 6.02214076e23

# xraylib shell -> XPS orbital name, occupancy-weighted later by (2j+1)
SHELLS = [
    ("K", "1s"), ("L1", "2s"), ("L2", "2p1/2"), ("L3", "2p3/2"),
    ("M1", "3s"), ("M2", "3p1/2"), ("M3", "3p3/2"), ("M4", "3d3/2"), ("M5", "3d5/2"),
    ("N1", "4s"), ("N2", "4p1/2"), ("N3", "4p3/2"), ("N4", "4d3/2"), ("N5", "4d5/2"),
    ("N6", "4f5/2"), ("N7", "4f7/2"),
    ("O1", "5s"), ("O2", "5p1/2"), ("O3", "5p3/2"), ("O4", "5d3/2"), ("O5", "5d5/2"),
    ("P1", "6s"), ("P2", "6p1/2"), ("P3", "6p3/2"),
]

# Siegbahn name, IUPAC (xraylib macro stem)
LINES = [
    ("Kα1", "KL3"), ("Kα2", "KL2"), ("Kβ1", "KM3"), ("Kβ3", "KM2"), ("Kβ2", "KN3"),
    ("Lα1", "L3M5"), ("Lα2", "L3M4"), ("Lβ1", "L2M4"), ("Lβ2", "L3N5"), ("Lβ3", "L1M3"),
    ("Lβ4", "L1M2"), ("Lγ1", "L2N4"), ("Lγ3", "L1N3"), ("Lℓ", "L3M1"), ("Lη", "L2M1"),
    ("Mα1", "M5N7"), ("Mα2", "M5N6"), ("Mβ", "M4N6"), ("Mγ", "M3N5"), ("Mζ1", "M5N3"), ("Mζ2", "M4N2"),
]

SYMBOLS = [xr.AtomicNumberToSymbol(z) for z in range(1, 99)]


def safe(fn, *a):
    try:
        v = fn(*a)
        return v if v and math.isfinite(v) else None
    except ValueError:
        return None


def barns(z, shell, e_kev):
    """Partial photoionisation cross section in barns/atom."""
    cs = safe(xr.CS_Photo_Partial, z, getattr(xr, shell + "_SHELL"), e_kev)
    return None if cs is None else cs * xr.AtomicWeight(z) / NA * 1e24


def imfp_nm(z, ke):
    """Seah-Dench IMFP for an element, nm."""
    rho = safe(xr.ElementDensity, z)
    if not rho or ke <= 0:
        return None
    a = (xr.AtomicWeight(z) / (rho * NA)) ** (1 / 3) * 1e7  # monolayer thickness, nm
    return (538 / ke**2 + 0.41 * math.sqrt(a * ke)) * a


def nist_lines():
    out = {}
    with open(NIST_TSV, encoding="utf-8") as f:
        rd = csv.reader(f, delimiter="\t")
        next(rd)
        for r in rd:
            if len(r) < 6 or "edge" in r[2]:
                continue
            fl = lambda s: float(s) if s.strip() else None
            out[(r[0].strip(), r[2].strip())] = (fl(r[3]), fl(r[5]))
    return out


def trz_beta():
    """{symbol: {orbital: [beta at TRZ_E]}} from the Trzhaskovskaya CSVs."""
    out = {}
    for f in os.listdir(TRZ_DIR):
        rows = list(csv.reader(open(os.path.join(TRZ_DIR, f), encoding="utf-8-sig")))
        if len(rows) < 6:
            continue
        sym = rows[0][1].strip()
        shells = {}
        for i in range(2, len(rows) - 3, 4):
            name = rows[i][0].strip().replace("1/2", "").replace("s", "s") if rows[i][0].strip().startswith(tuple("123456")) else None
            if not name:
                continue
            orb = rows[i][0].strip()
            orb = orb[:-3] if orb.endswith("s1/2") else orb
            try:
                shells[orb] = [float(v) for v in rows[i + 1][2:12]]
            except ValueError:
                pass
        out[sym] = shells
    return out


def sig(v, n=4):
    return None if v is None else float(f"{v:.{n}g}")


def r(v, n):
    return None if v is None else round(v, n)


def main():
    nist = nist_lines()
    beta = trz_beta()
    c1s = {e: barns(6, "K", e / 1000) for e in (AL_KA, MG_KA)}
    elements = {}
    for z, sym in enumerate(SYMBOLS, start=1):
        levels = []
        for shell, orb in SHELLS:
            be = safe(xr.EdgeEnergy, z, getattr(xr, shell + "_SHELL"))
            if be is None:
                continue
            be *= 1000
            row = {"orb": orb, "iupac": shell, "be": r(be, 1)}
            for tag, hv in (("Al", AL_KA), ("Mg", MG_KA)):
                ke = hv - be
                if ke <= 0:
                    continue
                cs = barns(z, shell, hv / 1000)
                row["ke" + tag] = r(ke, 1)
                row["cs" + tag] = r(cs / c1s[hv], 3) if cs else None
                row["imfp" + tag] = r(imfp_nm(z, ke), 2)
            row["xs"] = [sig(barns(z, shell, e) if e * 1000 > be else None) for e in GRID]
            b = beta.get(sym, {}).get(orb)
            if b:
                row["beta"] = [sig(v, 3) for v in b]
            jump = safe(xr.JumpFactor, z, getattr(xr, shell + "_SHELL"))
            if jump and shell in ("K", "L1", "L2", "L3", "M1", "M2", "M3", "M4", "M5"):
                row["jump"] = r(jump, 3)
            levels.append(row)

        xlines = []
        for name, iupac in LINES:
            macro = getattr(xr, iupac + "_LINE", None)
            if macro is None:
                continue
            e = safe(xr.LineEnergy, z, macro)
            if e is None:
                continue
            th, meas = nist.get((sym, iupac), (None, None))
            xlines.append({
                "name": name, "iupac": f"{iupac[0]}-{iupac[1:]}" if iupac[0] == "K" else f"{iupac[:2]}-{iupac[2:]}",
                "keV": r(e, 4), "rate": r(safe(xr.RadRate, z, macro), 4),
                "nistTh": r(th, 2), "nistExp": r(meas, 3),
            })

        yields = {}
        for shell in ("K", "L3", "M5"):
            y = safe(xr.FluorYield, z, getattr(xr, shell + "_SHELL"))
            if y:
                yields[shell] = r(y, 4)
        elements[sym] = {
            "z": z, "density": r(safe(xr.ElementDensity, z), 3), "mass": r(xr.AtomicWeight(z), 3),
            "levels": levels, "xray": xlines, "yield": yields,
            "mu": [sig(safe(xr.CS_Total, z, e)) for e in GRID],
        }

    data = {"version": 2, "grid": GRID, "trzE": TRZ_E, "source": f"xraylib {xr.__version__}, NIST SRD 128", "elements": elements}
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
    with gzip.open(OUT, "wb", 9) as f:
        f.write(raw)
    print(f"{OUT}: {len(elements)} elements, {len(raw)//1024} kB raw")


if __name__ == "__main__":
    main()
