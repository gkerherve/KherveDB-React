use tauri::{WebviewUrl, WebviewWindowBuilder};

/// Declines cookie banners (reject / necessary only) on reference sites; shared with the Python app.
const COOKIE_BANNER_JS: &str = include_str!("cookie_banner.js");

/// Open a reference website in its own window, with cookie banners declined automatically.
#[tauri::command]
fn open_reference(app: tauri::AppHandle, title: String, url: String) -> Result<(), String> {
    let parsed: tauri::Url = url.parse().map_err(|e| format!("{e}"))?;
    if parsed.scheme() != "https" {
        return Err("only https links can be opened".into());
    }
    // One window per site: reuse it when the same site is opened again
    let label = format!("ref-{}", parsed.host_str().unwrap_or("site").replace('.', "-"));
    if let Some(existing) = tauri::Manager::get_webview_window(&app, &label) {
        existing.navigate(parsed).map_err(|e| e.to_string())?;
        existing.set_title(&title).ok();
        existing.set_focus().ok();
        return Ok(());
    }
    WebviewWindowBuilder::new(&app, label, WebviewUrl::External(parsed))
        .title(title)
        .inner_size(1100.0, 850.0)
        .initialization_script(COOKIE_BANNER_JS)
        .build()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_reference])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
