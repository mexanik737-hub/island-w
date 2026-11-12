//! RU/EN translations for native UI.
use crate::{
    platform,
    settings::{self, Language},
};
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Lang {
    En,
    Ru,
}

#[tauri::command]
pub fn system_language() -> &'static str {
    if platform::system_prefers_russian() {
        "ru"
    } else {
        "en"
    }
}
pub fn lang() -> Lang {
    match settings::get().general.language {
        Language::Ru => Lang::Ru,
        Language::En => Lang::En,
        Language::System if platform::system_prefers_russian() => Lang::Ru,
        Language::System => Lang::En,
    }
}
pub fn tr(en: &'static str, ru: &'static str) -> &'static str {
    text_for(lang(), en, ru)
}
fn text_for(lang: Lang, en: &'static str, ru: &'static str) -> &'static str {
    match lang {
        Lang::En => en,
        Lang::Ru => ru,
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn native_translations_match_the_selected_language() {
        assert_eq!(text_for(Lang::En, "Settings", "Настройки"), "Settings");
        assert_eq!(text_for(Lang::Ru, "Settings", "Настройки"), "Настройки");
    }
}
