# cafe-lili-game

Local-first vanilla JS prototype for a coffee-stand game.

Quick Start
- Open `docs/index.html` in your browser (no server required). It loads the bundled `docs/app.bundle.js` to avoid file:// CORS issues.

Build / Bundle
- Install dev deps once: `npm install`
- Build human-readable bundle: `npm run bundle` (or `make bundle`)
- Build minified bundle: `npm run bundle:min` (or `make bundle-min`)
- Optional fallback (no Node): `make bundle-py` uses a minimal Python bundler.

Structure
- `docs/index.html`: Markup-only entry; links `styles.css` and `app.bundle.js`.
- `docs/app.bundle.js`: Output bundle suitable for `file://`.
- `docs/styles.css`: Extracted styles.
- `docs/js/` (modules for development):
  - `config.js` — central configuration
  - `state.js` — mutable runtime state + reset
  - `utils.js` — helpers (`clamp`, `randInt`, `el`, `fmtTime`, `logEvent`, …)
  - `satisfaction.js` — satisfaction math + tip model
  - `economy.js` — spend/earn
  - `orders.js` — order generation + totals
  - `render.js` — rendering, dev console, keypad, UI helpers
  - `report.js` — overlay show/hide
  - `game.js` — orchestration and transitions
  - `ui.js` — DOM bindings
  - `tests.js` — self-tests run on load
  - `main.js` — bootstrap
- `tools/bundle.py`: minimal Python fallback bundler
- `Makefile`: `bundle`, `bundle-min`, `bundle-py` targets

Development
- For modular development with live reload, run a tiny server and switch index to modules:
  - Serve: `python3 -m http.server 8000` in `docs/`
  - Change script tag in `docs/index.html` to `<script type="module" src="js/main.js"></script>` (instead of `app.bundle.js`).
  - For file:// distribution, switch back and run `npm run bundle`.

Notes
- Bundling uses esbuild to emit a single IIFE script that runs offline over `file://`. No runtime loader required.
