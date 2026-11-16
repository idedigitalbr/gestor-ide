use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

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
            // QUANDO CLICAR NO 'X', NÃO FECHA! ESCONDE NA BANDEJA (DISCORD / SPOTIFY STYLE)
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
