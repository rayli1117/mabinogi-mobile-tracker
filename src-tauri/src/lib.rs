#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .on_window_event(|window, event| {
      if window.label() != "main" {
        return;
      }
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window.hide();
      }
    })
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      #[cfg(desktop)]
      {
        use tauri::{
          menu::{Menu, MenuItem},
          tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
        };

        let toggle_overlay_item =
          MenuItem::with_id(app, "toggle-overlay", "顯示／隱藏 Overlay", true, None::<&str>)?;
        let show_main_item =
          MenuItem::with_id(app, "show-main", "顯示主視窗", true, None::<&str>)?;
        let quit_item = MenuItem::with_id(app, "quit", "結束", true, None::<&str>)?;
        let menu = Menu::with_items(
          app,
          &[&toggle_overlay_item, &show_main_item, &quit_item],
        )?;

        let icon = app
          .default_window_icon()
          .cloned()
          .expect("default window icon missing");

        TrayIconBuilder::with_id("main-tray")
          .icon(icon)
          .tooltip("瑪奇 Mobile 任務助手")
          .menu(&menu)
          .show_menu_on_left_click(false)
          .on_menu_event(|app, event| match event.id().as_ref() {
            "toggle-overlay" => toggle_overlay_window(app),
            "show-main" => show_main_window(app),
            "quit" => {
              app.exit(0);
            }
            _ => {}
          })
          .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
              button: MouseButton::Left,
              button_state: MouseButtonState::Up,
              ..
            } = event
            {
              toggle_overlay_window(tray.app_handle());
            }
          })
          .build(app)?;
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(desktop)]
fn show_main_window(app: &tauri::AppHandle) {
  use tauri::Manager;

  if let Some(win) = app.get_webview_window("main") {
    let _ = win.show();
    let _ = win.set_focus();
  }
}

#[cfg(desktop)]
fn toggle_overlay_window(app: &tauri::AppHandle) {
  use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

  if let Some(win) = app.get_webview_window("overlay") {
    match win.is_visible() {
      Ok(true) => {
        let _ = win.hide();
      }
      _ => {
        let _ = win.show();
        let _ = win.set_focus();
      }
    }
    return;
  }

  let builder = WebviewWindowBuilder::new(app, "overlay", WebviewUrl::App("index.html".into()))
    .title("任務 Overlay")
    .inner_size(360.0, 640.0)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(true);

  if let Err(err) = builder.build() {
    log::error!("Failed to create overlay window: {err}");
  }
}
