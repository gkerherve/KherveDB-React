//! "Other Databases & Properties" window: a small browser with one tab per reference site.
//!
//! The window holds a local tab bar (the app page at `#refbar`) and, below it, one real
//! browser view per tab. Clicking an element in the main window re-points every tab at
//! that element's page; tabs that are not visible reload only when they are selected.

use std::collections::HashMap;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Url, WebviewBuilder, WebviewUrl,
    WindowBuilder, WindowEvent,
};

/// Declines cookie banners (reject / necessary only) on reference sites; shared with the Python app.
const COOKIE_BANNER_JS: &str = include_str!("cookie_banner.js");

const WINDOW: &str = "references";
const BAR: &str = "refbar";
/// Height of the tab bar + toolbar, in logical pixels.
const BAR_HEIGHT: f64 = 116.0;

#[derive(Clone, Serialize, Deserialize)]
pub struct Tab {
    pub id: String,
    pub title: String,
    pub url: String,
}

#[derive(Clone, Serialize, Default)]
pub struct RefState {
    pub element: String,
    pub name: String,
    pub tabs: Vec<Tab>,
    pub active: String,
}

#[derive(Default)]
pub struct Refs {
    state: Mutex<RefState>,
    /// URL each created tab view currently shows
    loaded: Mutex<HashMap<String, String>>,
    zoom: Mutex<HashMap<String, f64>>,
}

fn view_label(tab: &str) -> String {
    format!("ref-{tab}")
}

fn parse(url: &str) -> Result<Url, String> {
    let u: Url = url.parse().map_err(|e| format!("{e}"))?;
    match u.scheme() {
        "https" | "tauri" | "http" => Ok(u),
        _ => Err("unsupported link".into()),
    }
}

/// Position of the tab views below the bar, from the window's current size.
fn content_bounds(app: &AppHandle) -> Option<(LogicalSize<f64>, LogicalSize<f64>)> {
    let win = app.get_window(WINDOW)?;
    let scale = win.scale_factor().ok()?;
    let size = win.inner_size().ok()?.to_logical::<f64>(scale);
    Some((
        LogicalSize::new(size.width, BAR_HEIGHT),
        LogicalSize::new(size.width, (size.height - BAR_HEIGHT).max(50.0)),
    ))
}

fn layout(app: &AppHandle) {
    let Some((bar, content)) = content_bounds(app) else { return };
    if let Some(v) = app.get_webview(BAR) {
        v.set_position(LogicalPosition::new(0.0, 0.0)).ok();
        v.set_size(bar).ok();
    }
    let tabs = app.state::<Refs>().state.lock().unwrap().tabs.clone();
    for t in tabs {
        if let Some(v) = app.get_webview(&view_label(&t.id)) {
            v.set_position(LogicalPosition::new(0.0, BAR_HEIGHT)).ok();
            v.set_size(content).ok();
        }
    }
}

/// Absolute URL of a tab; local pages ("app:...", the Properties tab) resolve against the app itself.
fn resolve(app: &AppHandle, url: &str) -> Result<Url, String> {
    match url.strip_prefix("app:") {
        Some(path) => {
            let bar = app.get_webview(BAR).ok_or("tab bar missing")?;
            bar.url().map_err(|e| e.to_string())?.join(path).map_err(|e| e.to_string())
        }
        None => parse(url),
    }
}

/// Show the active tab, creating or reloading its view as needed; hide the others.
fn show_active(app: &AppHandle) -> Result<(), String> {
    let refs = app.state::<Refs>();
    let st = refs.state.lock().unwrap().clone();
    let Some(tab) = st.tabs.iter().find(|t| t.id == st.active) else { return Ok(()) };
    let label = view_label(&tab.id);
    let (_, content) = content_bounds(app).ok_or("references window missing")?;

    let view = match app.get_webview(&label) {
        Some(v) => v,
        None => {
            let win = app.get_window(WINDOW).ok_or("references window missing")?;
            let v = win
                .add_child(
                    WebviewBuilder::new(&label, WebviewUrl::External(resolve(app, &tab.url)?))
                        .initialization_script(COOKIE_BANNER_JS),
                    LogicalPosition::new(0.0, BAR_HEIGHT),
                    content,
                )
                .map_err(|e| e.to_string())?;
            refs.loaded.lock().unwrap().insert(tab.id.clone(), tab.url.clone());
            v
        }
    };
    let stale = refs.loaded.lock().unwrap().get(&tab.id) != Some(&tab.url);
    if stale {
        let target = resolve(app, &tab.url)?;
        view.navigate(target).map_err(|e| e.to_string())?;
        refs.loaded.lock().unwrap().insert(tab.id.clone(), tab.url.clone());
    }
    for t in &st.tabs {
        if let Some(v) = app.get_webview(&view_label(&t.id)) {
            if t.id == st.active { v.show().ok(); } else { v.hide().ok(); }
        }
    }
    Ok(())
}

fn emit_state(app: &AppHandle) {
    let st = app.state::<Refs>().state.lock().unwrap().clone();
    app.emit_to(BAR, "ref-state", st).ok();
}

fn set_tabs(app: &AppHandle, element: String, name: String, tabs: Vec<Tab>) -> Result<(), String> {
    for t in &tabs {
        if !t.url.starts_with("app:") {
            parse(&t.url)?;
        }
    }
    let refs = app.state::<Refs>();
    let mut st = refs.state.lock().unwrap();
    if st.active.is_empty() || !tabs.iter().any(|t| t.id == st.active) {
        st.active = tabs.first().map(|t| t.id.clone()).unwrap_or_default();
    }
    st.element = element;
    st.name = name;
    st.tabs = tabs;
    Ok(())
}

/// Open (or bring forward) the references window for an element.
#[tauri::command]
pub async fn open_references(app: AppHandle, element: String, name: String, tabs: Vec<Tab>) -> Result<(), String> {
    set_tabs(&app, element.clone(), name, tabs)?;
    if let Some(win) = app.get_window(WINDOW) {
        win.set_title(&format!("Other Databases & Properties – {element}")).ok();
        win.unminimize().ok();
        win.set_focus().ok();
    } else {
        let win = WindowBuilder::new(&app, WINDOW)
            .title(format!("Other Databases & Properties – {element}"))
            .inner_size(800.0, 650.0)
            .min_inner_size(600.0, 400.0)
            .build()
            .map_err(|e| e.to_string())?;
        let size = win.inner_size().map_err(|e| e.to_string())?.to_logical::<f64>(win.scale_factor().unwrap_or(1.0));
        win.add_child(
            WebviewBuilder::new(BAR, WebviewUrl::App("index.html#refbar".into())),
            LogicalPosition::new(0.0, 0.0),
            LogicalSize::new(size.width, BAR_HEIGHT),
        )
        .map_err(|e| e.to_string())?;
        let handle = app.clone();
        win.on_window_event(move |ev| match ev {
            WindowEvent::Resized(_) | WindowEvent::ScaleFactorChanged { .. } => layout(&handle),
            WindowEvent::Destroyed => {
                let refs = handle.state::<Refs>();
                refs.loaded.lock().unwrap().clear();
                refs.zoom.lock().unwrap().clear();
            }
            _ => {}
        });
    }
    show_active(&app)?;
    emit_state(&app);
    Ok(())
}

/// Follow the element selected in the main window, if the references window is open.
#[tauri::command]
pub async fn update_references(app: AppHandle, element: String, name: String, tabs: Vec<Tab>) -> Result<(), String> {
    if app.get_window(WINDOW).is_none() {
        return Ok(());
    }
    set_tabs(&app, element.clone(), name, tabs)?;
    if let Some(win) = app.get_window(WINDOW) {
        win.set_title(&format!("Other Databases & Properties – {element}")).ok();
    }
    show_active(&app)?;
    emit_state(&app);
    Ok(())
}

#[tauri::command]
pub async fn select_ref_tab(app: AppHandle, id: String) -> Result<(), String> {
    app.state::<Refs>().state.lock().unwrap().active = id;
    show_active(&app)?;
    emit_state(&app);
    Ok(())
}

/// Point one tab at a new URL (Scholar searches typed in the tab bar).
#[tauri::command]
pub async fn ref_navigate(app: AppHandle, id: String, url: String) -> Result<(), String> {
    parse(&url)?;
    {
        let refs = app.state::<Refs>();
        let mut st = refs.state.lock().unwrap();
        if let Some(t) = st.tabs.iter_mut().find(|t| t.id == id) {
            t.url = url;
        }
        st.active = id;
    }
    show_active(&app)?;
    emit_state(&app);
    Ok(())
}

/// Back / forward / reload / home / zoom on the visible tab.
#[tauri::command]
pub async fn ref_action(app: AppHandle, action: String) -> Result<(), String> {
    let refs = app.state::<Refs>();
    let active = refs.state.lock().unwrap().active.clone();
    let Some(view) = app.get_webview(&view_label(&active)) else { return Ok(()) };
    match action.as_str() {
        "back" => view.eval("history.back()").map_err(|e| e.to_string())?,
        "forward" => view.eval("history.forward()").map_err(|e| e.to_string())?,
        "reload" => view.eval("location.reload()").map_err(|e| e.to_string())?,
        "home" => {
            refs.loaded.lock().unwrap().remove(&active);
            show_active(&app)?;
        }
        "zoom_in" | "zoom_out" | "zoom_reset" => {
            let mut zoom = refs.zoom.lock().unwrap();
            let z = zoom.entry(active).or_insert(1.0);
            *z = match action.as_str() {
                "zoom_in" => (*z * 1.1).min(3.0),
                "zoom_out" => (*z / 1.1).max(0.3),
                _ => 1.0,
            };
            view.set_zoom(*z).map_err(|e| e.to_string())?;
        }
        _ => return Err(format!("unknown action {action}")),
    }
    Ok(())
}

#[tauri::command]
pub fn get_ref_state(app: AppHandle) -> RefState {
    app.state::<Refs>().state.lock().unwrap().clone()
}
