//! The language of the few texts the backend shows itself: the tray menu,
//! the settings window's title and some error messages. The interface's own
//! texts live in `src/i18n`. The phone's page follows the phone's language
//! instead (see `share.rs`).

use crate::platform;
use crate::settings::{self, Language};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Lang {
    Fr,
    En,
    Ru,
}

/// The setting's language, or Windows' display language for "system":
/// Russian, French, or English, matching the interface's automatic language.
pub fn lang() -> Lang {
    match settings::get().general.language {
        Language::Ru => Lang::Ru,
        Language::Fr => Lang::Fr,
        Language::En => Lang::En,
        Language::System if platform::system_prefers_russian() => Lang::Ru,
        Language::System if platform::system_prefers_french() => Lang::Fr,
        Language::System => Lang::En,
    }
}

/// The text in the current language.
pub fn tr(fr: &'static str, en: &'static str) -> &'static str {
    match lang() {
        Lang::Fr => fr,
        Lang::En | Lang::Ru => en,
    }
}

/// A three-language translation for backend-owned UI such as the tray.
pub fn tr3(fr: &'static str, en: &'static str, ru: &'static str) -> &'static str {
    text_for(lang(), fr, en, ru)
}

fn text_for(language: Lang, fr: &'static str, en: &'static str, ru: &'static str) -> &'static str {
    match language {
        Lang::Fr => fr,
        Lang::En => en,
        Lang::Ru => ru,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn translations_do_not_depend_on_the_test_hosts_display_language() {
        for (language, expected) in [
            (Lang::Fr, "Bonjour"),
            (Lang::En, "Hello"),
            (Lang::Ru, "Привет"),
        ] {
            assert_eq!(text_for(language, "Bonjour", "Hello", "Привет"), expected);
        }
    }
}
