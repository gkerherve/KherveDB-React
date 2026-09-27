// Desktop (Tauri) vs web differences.
import type { ElementMeta } from "./data";
import { tabsFor } from "./sources";

export const isDesktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function invoke<T = void>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const core = await import("@tauri-apps/api/core");
  return core.invoke<T>(cmd, args);
}

const refArgs = (el: string, m: ElementMeta) => ({ element: el, name: String(m.props.Name ?? el), tabs: tabsFor(el, m) });

/** Desktop: open the tabbed "Other Databases & Properties" window for an element. */
export function openReferences(el: string, m: ElementMeta) {
  return invoke("open_references", refArgs(el, m));
}

/** Desktop: make the references window (if open) follow the selected element. */
export function followElement(el: string, m: ElementMeta) {
  return isDesktop ? invoke("update_references", refArgs(el, m)) : Promise.resolve();
}

/** Web: open a reference site in a new browser tab (these sites refuse to be embedded). */
export function openInBrowser(url: string) {
  window.open(url, "_blank", "noopener");
}

export { invoke };
