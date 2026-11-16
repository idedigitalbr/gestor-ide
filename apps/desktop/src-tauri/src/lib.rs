use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

static CLOSE_TO_TRAY: AtomicBool = AtomicBool::new(true);

#[tauri::command]
fn get_desktop_settings(app: tauri::AppHandle) -> serde_json::Value {
    let autostart_enabled = app.autolaunch().is_enabled().unwrap_or(true);
    serde_json::json!({
        "autostart": autostart_enabled,
        "closeToTray": CLOSE_TO_TRAY.load(Ordering::Relaxed),
        "isDesktop": true
    })
}

#[tauri::command]
fn set_desktop_settings(
    app: tauri::AppHandle,
    autostart: bool,
    close_to_tray: bool,
) -> Result<(), String> {
    CLOSE_TO_TRAY.store(close_to_tray, Ordering::Relaxed);
    let manager = app.autolaunch();
    if autostart {
        let _ = manager.enable();
    } else {
        let _ = manager.disable();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            get_desktop_settings,
            set_desktop_settings
        ])
        .setup(|app| {
            log::info!("IDE Gestor inicializando...");

            // Ativar inicialização automática com o Windows por padrão (estilo Discord/Spotify)
            let autostart = app.autolaunch();
            if let Ok(false) = autostart.is_enabled() {
                let _ = autostart.enable();
                log::info!("Inicialização com o Windows ativada com sucesso!");
            }

            // Criar menu do Tray (bandeja)
            let open_i = MenuItem::with_id(app, "open", "Abrir IDE Gestor", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Sair do IDE Gestor", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_i, &quit_i])?;

            // Configurar ícone na bandeja do sistema (ao lado do relógio)
            if let Some(icon) = app.default_window_icon() {
                let _tray = TrayIconBuilder::new()
                    .icon(icon.clone())
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .tooltip("IDE Gestor")
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "open" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
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
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(app);
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Se close_to_tray estiver ativado, esconde na bandeja em vez de fechar
            if let WindowEvent::CloseRequested { api, .. } = event {
                if CLOSE_TO_TRAY.load(Ordering::Relaxed) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
