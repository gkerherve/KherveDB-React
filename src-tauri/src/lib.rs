mod references;

use tauri::menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem};
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(references::Refs::default())
        .setup(|app| {
            // The default menu, with Preferences… added at the end of the Edit menu
            let menu = Menu::default(app.handle())?;
            for item in menu.items()? {
                if let MenuItemKind::Submenu(sub) = item {
                    if sub.text()? == "Edit" {
                        sub.append(&PredefinedMenuItem::separator(app)?)?;
                        sub.append(&MenuItem::with_id(app, "prefs", "Preferences…", true, Some("CmdOrCtrl+,"))?)?;
                    }
                }
            }
            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            if event.id() == "prefs" {
                let _ = app.emit_to("main", "open-prefs", ());
            }
        })
        .invoke_handler(tauri::generate_handler![
            references::open_references,
            references::update_references,
            references::select_ref_tab,
            references::ref_navigate,
            references::ref_action,
            references::get_ref_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
