# UI refinement, 12 November 2026

Baseline: GitHub `main` at `3c2fa57d4ed7ed772d209a0da8ac472f3c13595c`.

## Changes

- RU/EN dictionaries without English inheritance; FR settings migrate to System.
- Translated tab names, text and capture tools, character names, native settings titles and phone sharing page.
- Explicit place search with up to six full location labels; selecting a result saves its exact coordinates. Background refresh cannot replace a newly selected place.
- Localized weather symbols and units, including night icons. Current weather appears in a separate card beside the hourly and daily forecast.
- Ordered native window-region updates; shell morphing waits for an acknowledged region. Previous regions remain during collapse, scaled with animation speed. Animation handles stop on retarget/unmount.
- Theme-aware settings cards, controls and text; theme applied before paint.

## Visual evidence and limits

Compared the weather composition against the original [Island weather screenshot](https://github.com/exuupery/island/blob/main/docs/img/ru/tab-weather.png). The current implementation follows its two-column arrangement; typography, icon artwork, sky rendering and daily temperature bars are still different. This is not a 1:1 implementation.

`preview.html` is a development fixture using synthetic weather and a mocked native bridge. It is excluded from release entry points. Start Vite, then open `/preview.html?lang=ru&theme=dark`, `?lang=en&theme=light`, or `?view=settings&theme=light`.

Screenshots in `docs/visual-checks/` were inspected in the browser. Initial weather clipping and dark settings cards in light mode were found and corrected. Final weather panel content height equals its 330 px viewport; no vertical overflow in the default seven-day fixture.

Frontend type checking, production bundle and 180 tests pass locally. Rust formatting passes. Local native compilation is blocked by missing MSVC `link.exe`; exact Windows behavior, frame pacing, DPI scaling, live geocoding and OS theme events still require native verification. The synthetic preview does not prove those behaviors.

No AI, subscription, license gate or paid API added.
