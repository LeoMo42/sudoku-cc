# Changelog

All notable changes to this project will be documented in this file.

## [0.0.2.0] - 2026-05-02

### Added

- **SEO landing pages** for all 13 variants × 2 languages. Each variant now lives at its own URL (`/{lang}/{slug}`, e.g. `/en/killer-sudoku`, `/ru/windoku`) with a unique title, description, canonical URL, and `hreflang` alternates. Above each board, you'll find a one-line intro and a collapsible "How to Play" block with the variant's full rules. Google now sees 28 indexable pages instead of one.
- **Static prerendering at build time.** Every variant URL ships a fully-rendered HTML file in the deploy bundle. Crawlers and slow connections get the right `<title>`, `<meta>`, and visible content on the very first request — no JavaScript execution required.
- **Sitemap + robots.txt** generated automatically on every build, listing all 28 URLs with `hreflang` alternates so search engines find every locale.
- **Language switcher now updates the URL** so a `/en/killer-sudoku` you bookmark stays in English, and clicking RU on `/ru/thermo-sudoku` swaps the canonical URL to match.

### Improved

- **Help button** ("?" next to the type selector) has a 44×44 touch target now (WCAG AA / iOS HIG minimum) without growing visually. The visible 24×24 circle stays put; a transparent halo extends the tap area on all four sides.
- **Tailwind CSS 4 migration.** The site is now styled with Tailwind 4's Lightning CSS pipeline and a CSS-native `@theme` config. Vendor-prefixing is built in (no separate autoprefixer pass), and dark-mode utilities use the new `@custom-variant` directive.
- **Faster builds, smaller surface.** Removed `tailwind.config.js`, `autoprefixer`, and the old PostCSS plugin shim — production bundle is ~447 kB raw / 137 kB gzipped, build time around 600 ms.

### Fixed

- **Mid-game state on direct variant URLs.** Landing on `/en/killer-sudoku` while you have a half-finished Classic game in localStorage now correctly starts a Killer puzzle, not the persisted Classic. The earlier load-from-localStorage timing race would silently override the route's variant.
- **Single `<title>` on every page.** React 19 hoists meta tags but doesn't dedupe against static `index.html`. The template no longer ships a static `<title>`, so prerendered pages have exactly one effective title — the variant-specific one.

### For contributors

- **GameContainer refactored from 728 LOC to 573 LOC** (−21%). Four hooks extracted, each with focused unit tests: `useKeyboardShortcuts`, `useAutoStartIdle`, `useShare`, `usePuzzleLifecycle`. The "gravity well" issue (#116) is closed — new feature work no longer all stitches into one file.
- **TypeScript pinned to ~5.9** to keep `@typescript-eslint` v8 + `i18next` peer-deps happy. TS 6 produced `Unhandled node type` errors on a few v7 react-hooks rules; revisit when `@typescript-eslint` v9 lands stable.
- **Branch protection on `dev`** now requires up-to-date branches and the full check matrix (build, lint, typecheck, unit-tests, e2e × 3 browsers). `allow_auto_merge: true` at repo level — Approve + "Enable auto-merge" cascades cleanly.
- **`scripts/pr-watcher.sh`** ships as a cursor-based bash poller for PR comments + reviews. Pairs with Claude Code's Monitor tool (or any `tail -F` watcher); ~100× cheaper than naive polling because the JSON parsing happens outside the AI context.
- **Drift tests** between TypeScript source and `scripts/prerender.mjs` (slug list + `CANONICAL_BASE`) so adding a variant in `.ts` without updating the `.mjs` fails CI immediately.

## [0.0.1.0] - 2026-04-13

### Added
- Daily streak banner now appears as a full-width hero above the Sudoku board, replacing the smaller card in the right column. Shows today's puzzle number, current streak, and a prominent "Play today" call-to-action, or a green completion state with countdown to the next puzzle.

### Fixed
- Clicking "Play today" while mid-game now asks for confirmation before discarding your progress.
- Countdown timer no longer shows negative or garbled values after midnight.
- Countdown timer handles DST transitions correctly (no more "25:xx:xx" on fall-back nights).
- Streak data integrity: future-date guard prevents clock-back streak farming; localStorage no longer accumulates an unbounded `completedDates` array (#147).
- Daily puzzle now refreshes correctly when local midnight passes while the app is open or after waking from sleep (#148).
