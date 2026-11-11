# Windows build and CI diagnosis

## Confirmed Actions blocker

Run [43079309852](https://github.com/mexanik737-hub/island-w/actions/runs/43079309852), commit `1e7cff90ba1ccc7aa4674441aa739507d90f9bd5`, failed before runner assignment. The job API reports `runner_id: 0`, an empty runner name and `steps: []`. The run page's annotation states that the job was not started because recent account payments failed or the spending limit needs increasing. GitHub does not distinguish those two alternatives in that message.

This is an account billing/spending restriction, not evidence of a workflow step or compiler failure. The account owner must inspect Billing & plans and restore Actions availability, then rerun CI. No billing, payment, spending-limit, repository visibility or security settings were changed by this work. Do not solve this by removing checks or making this private repository public.

Logs/artifacts cannot be produced by workflow steps when GitHub never starts a runner. After runner assignment, the revised workflow separates frontend, Rust formatting, Windows native checks and packaging, with named steps and diagnostic artifacts. A skipped packaging job is not a successful package.

The revised workflow was recognized in [run 43082256427](https://github.com/mexanik737-hub/island-w/actions/runs/43082256427), commit `e73785ca2d112a040a93983b83816b2d9d725438`. Its three independent check jobs were each rejected with the same account-payment/spending-limit annotation. Packaging was skipped, as intended when prerequisite jobs fail. No runner executed its checks, and no installer was produced. Workflow recognition/dependency gating is confirmed; execution of the steps is not.

## Local prerequisites

- Windows 11 x64 for runtime validation.
- Node.js 22 (the CI baseline; Vite 8 requires a compatible modern Node), pnpm **10.33.2** from `package.json`.
- Stable Rust with the **x86_64-pc-windows-msvc** target, rustfmt and Clippy.
- Visual Studio 2022 C++ Build Tools: **Desktop development with C++**, x64/x86 MSVC tools and a Windows 10/11 SDK. Use Developer PowerShell for x64 so `cl.exe`, `link.exe`, `rc.exe`, INCLUDE and LIB are configured. Rust alone does not install these tools.
- Evergreen Microsoft Edge WebView2 Runtime for application launch. Compilation is not a runtime check. The NSIS configuration explicitly downloads the WebView2 bootstrapper if needed; installing a missing runtime therefore requires internet. No paid runtime is required.

See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) and [Windows packaging](https://v2.tauri.app/distribute/windows-installer/).

## Reproduce the checks

Run in Developer PowerShell, from the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm test
./scripts/check-windows-build.ps1
Push-Location src-tauri
cargo fmt --check
cargo check --locked --all-targets --target x86_64-pc-windows-msvc
cargo clippy --locked --all-targets --target x86_64-pc-windows-msvc -- -D warnings
cargo test --locked --all-targets --target x86_64-pc-windows-msvc
Pop-Location
```

Both lockfiles are committed and retained; no dependency upgrade was needed. The missing `Graphics_Imaging` and `Media_Ocr` Windows feature flags used by OCR were added. `cargo metadata --locked --offline` and the resolved feature graph accept the change without rewriting Cargo.lock. Tauri 2 manages its dependency's production/custom protocol mode through the CLI; an obsolete Tauri 1 application feature was not added.

## Compile first, then package

After all checks succeed:

```powershell
pnpm tauri build --ci --no-bundle --target x86_64-pc-windows-msvc -- --locked
pnpm tauri bundle --ci --bundles nsis --target x86_64-pc-windows-msvc
./scripts/verify-windows-package.ps1
```

`tauri build` runs the configured frontend build before compiling a production executable. The second command packages that executable without recompiling it. CI uploads the installer only after file checks pass: exactly one nonempty NSIS setup executable, an MZ header and SHA256. These checks do not install the application or validate UI startup. CI artifacts are unsigned test packages, not published releases. Updater artifacts remain disabled; no signing secret or paid signing service is needed for these checks.

CI uses Windows Server 2022 with the MSVC environment explicitly initialized. That host can compile the Windows x64 target; it is not a Windows 11 desktop and cannot prove microphone/media/interactive-shell behavior.

## Validation recorded on 2026-11-11

| Check | Result |
| --- | --- |
| pnpm 10.33.2 frozen install | Passed, lockfile unchanged |
| Frontend build / Vitest | Passed; 178 tests in 25 files |
| cargo fmt --check | Passed |
| cargo metadata / resolved OCR features | Passed with locked, offline resolution |
| cargo check / Clippy / cargo test | Attempted; blocked in dependency build scripts by missing MSVC `link.exe` before compiling Island-W |
| MSVC/SDK preflight | Failed explicitly: `cl.exe` absent |
| Tauri environment inspection | WebView2 157.0.4341.46 present; no Visual Studio/MSVC/SDK instance detected; local Node 24.22.1, Rust 1.99.1 |
| Workflow validation | actionlint 1.7.12 passed; PowerShell scripts parsed successfully |
| Installer verifier negative cases | Passed: empty directory and an invalid executable header are rejected |
| Release compilation / NSIS artifact | Not confirmed; gated on successful native checks |
| Running Windows 11 application | Not confirmed |

Rust checks were run with cached dependencies and `--offline` locally. Clippy was installed before its final attempt; no lint warning policy was disabled. Check the newest CI run for the current commit; the original billing annotation cannot prove that any later run executed.

## Integration gate after the build succeeds

Record Windows build number, WebView2 version, commit, device names, steps, expected/actual results and logs for every case. Until a runnable build exists, all cases below are **pending**, not passed.

1. Install the NSIS package as a regular user. Start from Start Menu with no development server; verify tray icon, visible island, settings, restart and clean exit. Inspect local application logs for WebView2/IPC errors.
2. Microphone: built-in, USB and Bluetooth inputs; change default input; level 0/50/100; mute/unmute; level changes preserve mute; rapid drag then mute; disconnect/reconnect during a change; external Windows default changes; no input devices. Confirm errors stay visible and the selected endpoint is the endpoint affected. Apps with explicit device routing may ignore the system default.
3. Media: play/pause/next/previous and seek against a real SMTC source; two concurrent sources; artwork; source exit/restart; no active session. Compare displayed state with the player after each action.
4. Island shell: hover/open/close, click-through outside its region, multi-monitor/DPI changes, fullscreen hide/restore, lock/unlock and sleep/resume, tray recovery after Explorer restart. Check reduced motion and RU/EN/FR for clipping. Do not redesign the interface to work around a startup defect.

Preserve the Island visual direction, Quiera-derived integrations, free functionality and exclusion of AI/subscriptions while resolving failures.
