// Desktop (Tauri) vs web differences.

export const isDesktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Open a reference website. On the desktop it opens in its own KherveDB window, where
 * cookie banners are declined automatically; on the web it opens in a new browser tab
 * (most of these sites refuse to be embedded in another page).
 */
export async function openReference(title: string, url: string): Promise<void> {
  if (isDesktop) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_reference", { title, url });
  } else {
    window.open(url, "_blank", "noopener");
  }
}
