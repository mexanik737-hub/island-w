# Island W

**A free Dynamic Island for Windows 11 — no Pro tier, no subscription, no AI.**

Island W combines the liquid visual language (French, English and Russian) and product direction of Island with the native Windows integrations and productivity modules from Quiera. This repository is an actively adapted codebase: modules are being integrated and validated in stages. The current import is not yet a finished release.

## Included in the current source tree

- Animated top-edge island shell with spring-based morphing, hover/peek states, click-through support and monitor placement.
- Windows-native media sessions (SMTC), artwork and synced lyrics lookup (LRCLIB).
- Quick controls for Wi-Fi, Bluetooth, audio devices, master volume and per-app volume; microphone selection, level and mute; lock, sleep, restart and shutdown with confirmation.
- Session clipboard, file Shelf with drag-out and local phone sharing, file launcher, calendar/ICS, timer, natural-language reminders, notes and folders, notifications, webcam mirror, local text transformations, calculator, unit/temperature and currency conversion, explicit CMD/PowerShell command launch, screen capture/annotation/crop/blur/text, screen recording, local Windows OCR, QR reading, a magnifying color picker with history, and a user-selected weather forecast.
- Local settings and application data.

## Planned Island parity work

Remaining parity work includes Windows-native region capture and Media Foundation MP4/GIF recording, weather alerts, the original 25 character animations and reactions, VPN client adapters, theme/scale/transparency options, system-wide hotkeys (paste without formatting, clipboard, screenshot and recording), richer note formatting, and a final settings/installer pass. AI-related functions are deliberately excluded.

## Build (Windows 11)

Requirements: Windows 11 x64, Node.js 22+, pnpm 10.33.2, stable MSVC Rust, Visual Studio C++ Build Tools with a Windows SDK, and the WebView2 runtime. Use Developer PowerShell for x64. See [Windows build and CI diagnosis](docs/WINDOWS_BUILD.md) for exact checks, packaging and current blockers.

```powershell
pnpm install
pnpm build
pnpm tauri dev
```

Backend checks:

```powershell
cd src-tauri
cargo test
cargo clippy --all-targets -- -D warnings
```

## Important notes

- The initial migration has not yet been compiled or run on a Windows device. APIs that depend on OS permissions, package identity or device drivers need validation on a real Windows 11 system.
- The updater endpoint is pointed at this repository, but release signing keys and a release workflow still need to be configured before automatic updates can be enabled for public builds.
- Network features are limited to explicit services (for example LRCLIB for synced lyrics and calendar feed URLs supplied by the user). No AI services or AI agent hooks are included.
- Island W includes GPL-3.0-or-later code from Quiera. The combined work is provided under GPL-3.0-or-later; see [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Credits

- Visual and product direction: Island.
- Windows native integrations and reusable application modules: [Quiera](https://github.com/quierapro/quiera-island).
- Island W is a modified derivative; upstream license and third-party notices are retained.
