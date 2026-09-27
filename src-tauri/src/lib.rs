mod references;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(references::Refs::default())
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
