import type { ElementMeta } from "./data";

export type Source = {
  id: string;
  title: string;
  help: string;
  /** Needs a material typed by the user */
  search?: { placeholder: string; query: (terms: string, el: string) => string };
  url?: (el: string, meta: ElementMeta) => string;
};

const scholar = (q: string) => `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`;

export const SOURCES: Source[] = [
  {
    id: "xpsfitting",
    title: "XPS Fitting",
    help: "XPSfitting.com (M. Biesinger): practical notes, reference spectra and fitting parameters for the element.",
    url: (_el, m) => m.urls.xpsfitting,
  },
  {
    id: "harwell",
    title: "Harwell XPS Guru",
    help: "Harwell XPS knowledge base: peak positions, fitting advice and pitfalls for the element.",
    url: (_el, m) => m.urls.harwell,
  },
  {
    id: "thermo",
    title: "Thermo Knowledge",
    help: "Thermo Fisher XPS periodic table: main peaks, overlaps, spin-orbit splitting and chemical-state tables.",
    url: (_el, m) => m.urls.thermo,
  },
  {
    id: "sss",
    title: "SSS from Scholar",
    help:
      "Finds reference spectra published in Surface Science Spectra. Type a material (e.g. Fe2O3, NiO thin film): " +
      'the search is refined to source:"Surface Science Spectra" XPS + your material.',
    search: {
      placeholder: "Material, e.g. Fe2O3",
      query: (t, el) => scholar(`source:"Surface Science Spectra" XPS ${t || el}`),
    },
  },
  {
    id: "estr",
    title: "Electronic structure (Scholar)",
    help: "Finds papers on the electronic structure of a material. 'electronic structure' is added to your terms.",
    search: {
      placeholder: "Material, e.g. TiO2 anatase",
      query: (t, el) => scholar(`electronic structure ${t || el}`),
    },
  },
];
