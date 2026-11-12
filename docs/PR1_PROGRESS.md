# PR #1 implementation and verification report

Updated 13 November 2026. PR #1 remains open as a draft and has not been merged.

## Implemented

- RU/EN interface with Russian selected from the Windows UI language; French was removed from selectable installer languages and remaining French UI strings were replaced. Existing `fr` settings are still accepted for migration to System.
- Weather results show distinct places and use the selected result's exact coordinates. The saved forecast survives refreshes, and an older refresh cannot overwrite a newer selection. The panel uses a scroll-safe two-column layout.
- Text controls temporarily activate the native window while editing, then restore the no-activate behavior. Shortcut names now follow RU/EN even when an old saved label is in French.
- Recording state lives outside the capture panel. Closing or unmounting the panel does not stop it; explicit stop and application exit finalize the file. Phone sharing remains active across panel changes. Compact and Windows tray controls expose activity and stop actions while the island is hidden.
- The last tab is restored, automatic hide can be disabled, and active process indicators remain after folding. The character occupies a separate region left of the capsule. The shelf is always available and supports file selection, drag and drop, removal, opening, and adding a captured screenshot.
- Shared translucent colors and primary module surfaces now use theme tokens.

## Automated checks

- Local Windows workspace: TypeScript check passed, Vite production build passed, 188 frontend tests passed, Rust formatting check passed, and `git diff --check` passed.
- GitHub Actions run #57: frontend build/tests, Rust formatting, Windows Cargo check, Clippy with warnings denied, native tests, release compilation, Windows startup smoke check, NSIS packaging and installer verification all passed. [Windows x64 test package](https://github.com/mexanik737-hub/island-w/actions/runs/43314558432) is artifact `Island-W-windows-x64-3b5843c561a02d2745e5ede732d2bdf9315044f6` (8.5 MB, artifact ID `13986804924`, retained through 26 November 2026). The SHA256 of the uploaded ZIP is `5a21f6b047974f2ec2ee60c67f3ec958e6552b2304d4f0033bb1a7363365de76`.
- An earlier CI run exposed a Windows API type mismatch in temporary text-input activation; it was corrected. The subsequent run also exposed corrupted file transfer through an oversized API payload; the affected RU and settings files were restored through the UTF-8 file API and the passing frontend job confirms their source now parses.
- Local native compilation is unavailable because this workspace lacks the MSVC linker. The hosted Windows runner is Windows Server 2022. Its successful startup smoke check does not count as interactive Windows 11 verification.

## Windows 11 checks still required

- Install and launch the produced package, then check RU/EN, light/dark/system theme, 100–200% display scaling, text entry including Cyrillic/IME and clipboard shortcuts, click-through and focus restoration.
- Exercise screen capture selection, crop, annotation, blur, video recording and playback of the saved file. Minimize, auto-hide, switch tabs and reopen while recording; confirm the file finalizes only on explicit stop or exit.
- Keep phone sharing active while hiding and reopening the island; open its controls and stop it from the tray while hidden.
- Verify animation frame pacing and character placement at screen edges and with reduced motion.

The current screenshots under `docs/visual-checks/` are synthetic browser fixtures from the earlier layout pass; they are not screenshots of this latest branch. The current browser preview could not be opened in the local browser environment. The visual comparison with `exuupery/island` remains partial. This report does not claim 1:1 visual parity or completed interactive validation.

No AI, paid API, subscription or license gate was added.

