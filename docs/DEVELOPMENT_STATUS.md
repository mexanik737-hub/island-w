# Development checkpoint — 2026-11-11

Continued from main `09a323e9bad5d0b802c465381ce45f1fc77df8d7`, rather than reimporting Quiera.

## Changes

- Fixed explicit Russian language selection and an unused import that prevented the frontend build.
- Added microphone selection for Windows' console, multimedia and communications roles, plus endpoint level and mute controls. These affect applications using the system default; an application's explicit microphone selection is unchanged.
- Reused Quiera-derived endpoint enumeration, names and policy interface. The microphone controls do not open an audio stream or record audio.
- Kept microphone writes in order, bound them to the displayed endpoint ID and surfaced device errors. Volume adjustments preserve mute. The controls reuse the existing island pill, icons and device-list transitions, with English, French and Russian labels.

## Validation

- `pnpm build`: passed.
- `pnpm test`: 178 tests passed across 25 files, including ordered microphone writes, recovery after device failure, routing IDs and translations.
- `cargo fmt --check`: passed after a separate formatting-only cleanup of six pre-existing files that also failed the CI formatting gate.
- `cargo check --locked`: blocked before application compilation because this machine lacks the MSVC linker `link.exe`. Rust tests and Clippy are not confirmed.
- GitHub Actions failed for both the starting HEAD and the language/build fix; the job exposed no step summaries or logs. This is not evidence that the Windows build passes. Check the run associated with the latest commit before releasing.
- Microphone behavior and visual layout have not yet been exercised in a running Windows 11 application.

## Remaining verification

Build with Visual Studio C++ Build Tools and Windows SDK, run Cargo tests/Clippy, then test built-in/USB/Bluetooth microphones, disconnect/reconnect, external default changes, zero devices, mute persistence and all three UI languages.

Existing character work consists of per-character idle animation with emoji/glyph representations. Original artwork and event reactions remain incomplete. Windows capture/recording parity and other items in README remain future work. No AI or paid service was added.
