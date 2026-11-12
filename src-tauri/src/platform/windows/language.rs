//! Windows' display language, for the "system" language setting.

use windows::Win32::Globalization::GetUserDefaultUILanguage;

/// Whether Windows shows itself in Russian.
pub fn system_prefers_russian() -> bool {
    // SAFETY: a plain query with no arguments.
    const LANG_RUSSIAN: u16 = 0x19;
    let id = unsafe { GetUserDefaultUILanguage() };
    id & 0x3ff == LANG_RUSSIAN
}
