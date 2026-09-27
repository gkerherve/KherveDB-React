import type { ElementMeta } from "./data";

export type Source = {
  id: string;
  title: string;
  help: string;
  /** Tabs with a search box: the material typed by the user refines the query */
  search?: { placeholder: string; query: (terms: string) => string };
  url: (el: string, meta: ElementMeta) => string;
};

const scholar = (q: string) => `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`;
const sss = (t: string) => scholar(`source:"Surface Science Spectra" XPS ${t}`);
const estr = (t: string) => scholar(`electronic structure ${t}`);
const elName = (el: string, m: ElementMeta) => String(m.props.Name ?? el);

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
      "Reference spectra from Surface Science Spectra. Type a material in the search box (e.g. Fe2O3) and press Enter: " +
      'the search is refined to source:"Surface Science Spectra" XPS + your material.',
    search: { placeholder: "Material, e.g. Fe2O3", query: sss },
    url: (el, m) => sss(elName(el, m)),
  },
  {
    id: "estr",
    title: "Good paper Scholar",
    help:
      "Papers on the electronic structure of a material. Type a material in the search box (e.g. TiO2 anatase) " +
      "and press Enter: 'electronic structure' is added to your terms.",
    search: { placeholder: "Material, e.g. TiO2 anatase", query: estr },
    url: (el, m) => estr(elName(el, m)),
  },
];

export const PROPS_TAB = {
  id: "props",
  title: "General Properties",
  help: "Physical and atomic properties of the element, and its main XPS lines.",
};

export type TabSpec = { id: string; title: string; url: string };

/** Tabs of the references window for one element. */
export function tabsFor(el: string, m: ElementMeta): TabSpec[] {
  return [
    ...SOURCES.map((s) => ({ id: s.id, title: s.title, url: s.url(el, m) })),
    { id: PROPS_TAB.id, title: PROPS_TAB.title, url: `app:index.html#props/${el}` },
  ];
}
