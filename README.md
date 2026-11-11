# Island W

**A free Dynamic Island for Windows 11 — no Pro tier, no subscription, no AI.**

Island W combines the liquid visual language and product direction of Island with the native Windows integrations and productivity modules from Quiera. This repository is an actively adapted codebase: modules are being integrated and validated in stages. The current import is not yet a finished release.

## Included in the current source tree

- Animated top-edge island shell with spring-based morphing, hover/peek states, click-through support and monitor placement.
- Windows-native media sessions (SMTC), artwork and synced lyrics lookup (LRCLIB).
- Quick controls for Wi-Fi, Bluetooth, audio devices, master volume and per-app volume.
- Session clipboard, file Shelf with drag-out and local phone sharing, file launcher, calendar/ICS, timer, notifications, webcam mirror, local text transformations, multi-note folders and recurring reminders, screen capture/annotation, screen recording, QR reading and a color picker.
- Local settings and application data.

## Planned Island parity work

The next integration stages cover Windows-native OCR, the weather panel and alerts, the complete 25-character collection, additional live status chips, VPN integrations, microphone/camera controls, and the remaining system-wide keyboard shortcuts. AI-related functions are deliberately excluded.

## Build (Windows 11)

Requirements: Windows 11 x64, Node.js 20+, pnpm 10, stable Rust, and the WebView2 runtime.

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
