# Contributing to tanstack-hide

Thanks for your interest in improving **tanstack-hide**. This guide covers how to get set up, the conventions we follow, and what a good pull request looks like.

By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting started

```sh
git clone https://github.com/khanakia/tanstack-hide.git
cd tanstack-hide
npm install
```

Load the folder as an unpacked extension (`chrome://extensions` → Developer mode → **Load unpacked**). After editing code, click the reload icon on the extension's card and reload the test tab. There is no build step: the files in the repo are the extension.

You need [Task](https://taskfile.dev) for the commands below, and a Chrome for Testing binary for the test (`npx @puppeteer/browsers install chrome@stable`), because branded Chrome no longer loads unpacked extensions from the command line.

| Command | What it does |
|---|---|
| `task test` | End-to-end test of the real extension in headless Chrome for Testing. Set `E2E_URL` to a page that renders TanStack Devtools. |
| `task screenshots` | Run the test and refresh the README screenshots in `docs/screenshots/`. |
| `task brand` | Regenerate the brand kit and extension icons from `brand/gen-brand.mjs`. |
| `task zip` | Package the extension into `dist/`. |

## Code layout

- `hide.css`: the one CSS rule that hides the trigger. Its selector must match `TRIGGER_SELECTOR` in `shared.js`.
- `shared.js`: settings model and the hide/show decision, shared by every other script.
- `content.js`: applies the decision on each page and reports what it found.
- `background.js`: toolbar status dot and the keyboard shortcut.
- `popup.html`, `popup.css`, `popup.js`: the popup.
- `tests/e2e.mjs`: the end-to-end test.

## Ways to contribute

- **Report a bug**: open an issue with the bug template. Include your Chrome version, the extension version, and the HTML of the devtools button if it is not being hidden.
- **Request a feature**: open an issue with the feature template. Describe the problem first, then your proposed solution.
- **Send a pull request**: for anything non-trivial, open an issue first so we can agree on the approach before you write code.

## Branches and commits

- Branch off `main`. Use a short descriptive branch name (`fix/...`, `feat/...`, `docs/...`).
- Write commits in **Conventional Commit** style: `type(scope): description` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`).
- Keep commits focused: one logical change per commit where practical.

## Pull request checklist

- [ ] The change is scoped and described (link the issue it closes).
- [ ] `task test` passes.
- [ ] New behaviour has a check in `tests/e2e.mjs` where it makes sense.
- [ ] README, screenshots (`task screenshots`) and CHANGELOG updated if the change is user-facing.
- [ ] `version` in `manifest.json` bumped for a release.
- [ ] No unrelated files or formatting churn.

## Changelog

User-facing changes go under `[Unreleased]` in [CHANGELOG.md](CHANGELOG.md), following [Keep a Changelog](https://keepachangelog.com/).

## Questions

Open an [issue](https://github.com/khanakia/tanstack-hide/issues). We're happy to help you land your first contribution.
