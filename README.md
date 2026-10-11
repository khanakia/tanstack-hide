<p align="center"><img src="brand/icon.svg" width="96" alt="TanStack Hide logo"></p>

# TanStack Devtools Trigger Hide

A Chrome extension that hides the floating TanStack Devtools corner button, globally or per site. Only the button is hidden: the devtools panel stays on the page, so its own hotkey (Ctrl + ~ by default) still opens it.

## Features

- **Hidden by default** on every site, with no flash of the button while the page loads.
- **Master switch** to pause the extension everywhere without losing your rules.
- **Global default** ("Hide on all sites") for any site without its own rule.
- **Per-site rules**: Global / Always hide / Always show, keyed by host and port, so `localhost:3000` and `localhost:5173` are separate.
- **Site rules list** in the popup, with one-click removal.
- **Status dot** on the toolbar icon: green = hidden, amber = visible by a rule, grey = paused, no dot = no TanStack Devtools on the page.
- **Shortcut** Alt + Shift + H flips the current site (change it at `chrome://extensions/shortcuts`).
- Settings sync across your Chrome profile. Changes apply to open tabs instantly.

## Install

1. Clone this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the repo folder.
4. Reload any tab that was open before installing.

## Development

Commands live in `Taskfile.yml` ([Task](https://taskfile.dev)):

| Task | What it does |
|---|---|
| `task test` | End-to-end test of the real extension in headless Chrome for Testing. Set `E2E_URL` to a page that renders TanStack Devtools; screenshots go to `.e2e/`. |
| `task icons` | Rebuild `icons/*.png` from `brand/icon.svg` (needs `rsvg-convert`). |
| `task zip` | Package the extension into `dist/` for the Chrome Web Store. |

Branded Chrome no longer loads unpacked extensions from the command line, so `task test` needs a Chrome for Testing binary (`npx @puppeteer/browsers install chrome@stable`, or set `CFT` to its path).

## How it works

- `hide.css` hides the button unless `<html>` carries the `tsh-show` class, so the default is hidden before any script runs.
- `content.js` reads the settings, sets or clears that class, and reports whether TanStack Devtools is on the page.
- `background.js` draws the status dot onto the toolbar icon for each tab.
- `shared.js` holds the settings model and the hide/show decision used by all three.

The logo is original artwork in the spirit of the TanStack devtools badge; it is not the TanStack logo. TanStack is a trademark of its owners, and this project is not affiliated with them.

## License

MIT
