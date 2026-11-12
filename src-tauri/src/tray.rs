//! Notification-area icon: the only way to quit, since the island has no
//! window frame.

use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, Wry};

static QUIT_AFTER_RECORDING: AtomicBool = AtomicBool::new(false);

use crate::i18n::tr;

const QUIT: &str = "quit";
const SETTINGS: &str = "settings";
const UPDATE: &str = "update";
const RECORDING: &str = "recording";
const SHARING: &str = "sharing";

/// The menu's items, renamed when the language changes or an update is found.
struct Items {
    settings: MenuItem<Wry>,
    update: MenuItem<Wry>,
    recording: MenuItem<Wry>,
    sharing: MenuItem<Wry>,
    quit: MenuItem<Wry>,
    recording_active: AtomicBool,
    recording_seconds: AtomicU64,
    share_count: AtomicU32,
}

pub fn create(app: &tauri::App) -> tauri::Result<()> {
    let settings = MenuItem::with_id(app, SETTINGS, "", true, None::<&str>)?;
    let update = MenuItem::with_id(app, UPDATE, "", true, None::<&str>)?;
    let recording = MenuItem::with_id(app, RECORDING, "", false, None::<&str>)?;
    let sharing = MenuItem::with_id(app, SHARING, "", false, None::<&str>)?;
    let quit = MenuItem::with_id(app, QUIT, "", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&settings, &update, &recording, &sharing, &quit])?;
    app.manage(Items {
        settings,
        update,
        recording,
        sharing,
        quit,
        recording_active: AtomicBool::new(false),
        recording_seconds: AtomicU64::new(0),
        share_count: AtomicU32::new(0),
    });
    refresh(app.handle());
    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip("Island")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            if event.id() == SETTINGS {
                crate::settings::open_window(app);
            } else if event.id() == UPDATE {
                crate::updates::tray_clicked(app);
            } else if event.id() == RECORDING {
                let _ = app.emit("island://recording-stop", ());
            } else if event.id() == SHARING {
                let _ = app.emit("island://shelf-open", ());
            } else if event.id() == QUIT {
                log::info!("quit requested from the tray");
                let recording = app
                    .try_state::<Items>()
                    .is_some_and(|items| items.recording_active.load(Ordering::Relaxed));
                if recording {
                    QUIT_AFTER_RECORDING.store(true, Ordering::Relaxed);
                    let _ = app.emit("island://app-quit", ());
                    let app = app.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_secs(5));
                        if QUIT_AFTER_RECORDING.swap(false, Ordering::Relaxed) {
                            app.exit(0);
                        }
                    });
                } else {
                    app.exit(0);
                }
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

/// Sets the menu's texts: in the current language, the update item naming
/// the version found if there is one.
pub fn refresh(app: &AppHandle) {
    let Some(items) = app.try_state::<Items>() else {
        return;
    };
    let _ = items.settings.set_text(tr("Settings…", "Настройки…"));
    let _ = items.quit.set_text(tr("Quit Island", "Выйти из Island"));
    let recording_active = items.recording_active.load(Ordering::Relaxed);
    let recording_seconds = items.recording_seconds.load(Ordering::Relaxed);
    let recording_text = if recording_active {
        format!(
            "{} · {:02}:{:02}",
            tr("Stop recording", "Остановить запись"),
            recording_seconds / 60,
            recording_seconds % 60
        )
    } else {
        tr("No screen recording", "Запись экрана не ведётся").to_owned()
    };
    let _ = items.recording.set_text(recording_text);
    let _ = items.recording.set_enabled(recording_active);
    let share_count = items.share_count.load(Ordering::Relaxed);
    let sharing_text = if share_count > 0 {
        format!(
            "{} · {share_count}",
            tr("Local sharing", "Локальная передача")
        )
    } else {
        tr("No local shares", "Нет активной передачи").to_owned()
    };
    let _ = items.sharing.set_text(sharing_text);
    let _ = items.sharing.set_enabled(share_count > 0);
    let update = match crate::updates::available() {
        Some(version) => format!(
            "{} {version}",
            tr("Install update", "Установить обновление")
        ),
        None => tr("Check for updates", "Проверить обновления").to_owned(),
    };
    let _ = items.update.set_text(update);
}

pub fn process_status(
    app: &AppHandle,
    recording_active: bool,
    recording_seconds: u64,
    share_count: u32,
) {
    let Some(items) = app.try_state::<Items>() else {
        return;
    };
    items
        .recording_active
        .store(recording_active, Ordering::Relaxed);
    items
        .recording_seconds
        .store(recording_seconds, Ordering::Relaxed);
    items.share_count.store(share_count, Ordering::Relaxed);
    refresh(app);
}

#[tauri::command]
pub fn recording_finished(app: AppHandle) {
    if QUIT_AFTER_RECORDING.swap(false, Ordering::Relaxed) {
        app.exit(0);
    }
}
