# TODOS

Small, in-flight, or "don't forget" work items that aren't worth a full
GitHub issue, plus a backlog of open issues prioritised. gstack `/retro`
reads this file: P0/P1/P2 buckets feed the backlog-health metric, and
the `## Completed` section tracks landing velocity.

> **Format rules (load-bearing for gstack):**
> - `- [ ]` for open items, `- [x]` for done (still in a P-bucket means
>   "done locally, waiting on PR/merge")
> - Items in `## Completed` MUST start with a `YYYY-MM-DD:` date prefix
>   so the retro can window them
> - Reference GitHub issues as `#NNN` so the link auto-resolves

## P0 — Critical

### Game-state corruption (research round, 2026-05-03)

- [ ] **#210** Killer cages can contain duplicate digits — `generateKillerCages` grows cages by adjacency without checking digit uniqueness; validator forbids dups → puzzle unsolvable. High repro probability on a headline variant.
- [ ] **#215** `PAUSE_GAME` / `RESUME_GAME` resurrect terminal states — no guard for COMPLETED / LOST. Player loses game, dispatches pause/resume, game becomes editable again past the mistake limit.

## P1 — Urgent

### Variant correctness (algo, research round)

- [ ] **#209** Non-Consecutive variant ships invalid solutions — digit permutation breaks the arithmetic constraint; affects 100% of Non-Consecutive games. Existing test acknowledges with `expect(typeof foundValid).toBe('boolean')` no-op.
- [ ] **#211** Non-classic variants ship multi-solution puzzles — uniqueness check explicitly disabled for perf. Player's correct alternate solution rejected by Check. 11 variants affected.
- [ ] **#212** Validator accepts impossible mid-game states for Killer / Thermo / Greater-than — partial-state checks bail on first empty neighbor.

### State machine + storage (GameContext, research round)

- [ ] **#216** `SET_CELL_VALUE` not blocked while paused — UI hides numpad but reducer doesn't enforce; keyboard shortcuts can still mutate.
- [ ] **#217** `activeHint` not cleared on board changes — `APPLY_HINT` can overwrite fresh user input with stale hint placement.
- [ ] **#218** `localStorage` access outside try/catch can crash provider mount — disabled storage / SecurityError white-screens the app.

### UX regressions from PR #108 (post-hoc /codex review)

- [ ] **#223** SEO/routing: variant→variant nav desync + `<html lang="en">` hardcoded on RU pages — board stays old variant when URL/SEO updates; all 14 RU prerendered routes ship wrong document language.
- [ ] **#224** Tailwind 4 relics: Modal backdrop fully black + `flex-shrink-0` × 4 places — `bg-opacity-50` is a v3-only utility, every modal renders with 100% opaque backdrop.
- [ ] **#225** `scripts/pr-watcher.sh` silent cursor advance on API failure — `poll_once || ...` disables errexit; cursor advances even on `gh api` failure → permanent silent loss of PR comments in `--watch` mode.

## P2 — Important

### Variant correctness (algo, research round)

- [ ] **#213** Hint engine: bogus eliminations from Fish + Unique Rectangle — Fish accepts zero-candidate base rows; UR applied unconditionally on non-unique puzzles. Cascade from #211.
- [ ] **#214** Classic uniqueness check runs only every 5 removals — restore only restores current cell, not the actual culprit. Same UX failure as #211, lower frequency.

### State machine + scoring (GameContext)

- [ ] **#219** Hint counter bypass — `GET_HINT` doesn't increment `hintsUsed`; only `APPLY_HINT` does. Player can request, see, dismiss hints to bypass per-difficulty limit.
- [ ] **#220** Killer Sudoku ignores `difficulty` — early return at `_createPuzzle:601` before reading `DIFFICULTY_LEVELS`. Easy and Expert produce identical puzzles.
- [ ] **#221** Undo history records redundant entries for no-op moves — same wrong digit twice creates 2 history entries, undo requires 2 presses.
- [ ] **#222** `bestTime` keyed by difficulty alone, conflates variants with `stats` — Classic Easy time displayed for Killer Easy.

### Routing edges + build pipeline (research round)

- [ ] **#226** i18n localStorage key mismatch + `RootRedirect` drops query params — saved language ignored; `/?type=KILLER` deep-links broken.
- [ ] **#227** `prerender.mjs` cleanup leak when `chromium.launch()` fails — preview server stays bound to port 4173.
- [ ] **#228** `ci.yml` missing explicit `permissions:` block — defense-in-depth gap, add `contents: read`.

## P3 — Nice to have

- [ ] Submit `https://leomo42.github.io/sudoku-cc/sitemap.xml` to Google Search Console — one-time human action after first deploy with #203 to start indexation of 28 variant pages.
- [ ] `@dependabot ignore` major bumps for `tailwindcss` — covered Tailwind 4 manually via #200; future v4.x patch/minor still useful, but v5 will need its own migration cycle.
- [ ] Uninstall `@testing-library/user-event` (in `ignoreDependencies` per knip but actually unused — see knip.json comment).
- [ ] **PR2-style audit** for stale `eslint-disable-next-line` directives — only one was found (#204), but worth a periodic sweep as the react-hooks plugin evolves its heuristics.

## Completed

- 2026-05-02: **#23** SEO landing pages with i18n routing — full 5-PR stack: routing skeleton (#189), per-route Helmet meta + h1 (#197), static prerender × 28 routes (#199), sitemap.xml + robots.txt (#202), per-variant intro + rules block (#203). Goes from 1 indexable page → 28.
- 2026-05-02: **#160** (dependabot) Tailwind v3 → v4 migration — installed `@tailwindcss/postcss`, replaced `@tailwind` directives with `@import 'tailwindcss'`, added `@custom-variant dark` (legacy `darkMode: 'class'` JS config not honored), restored v3 default border-color (PR #200). Follow-up #205 moved fontFamily to CSS-native `@theme` block, deleted `tailwind.config.js`.
- 2026-05-02: **TS pin to ~5.9** — TS 6 had `Unhandled node type` errors with `@typescript-eslint` v8 + i18next peer-dep mismatches (PR #191).
- 2026-05-02: Branch protection + auto-merge plumbing — strict mode on dev, expanded required checks (build/lint/typecheck/unit-tests/e2e × 3), `allow_auto_merge: true`, `rebase-strategy: auto` in dependabot config (#194). Auto-update PR-branch workflow tried (#198) and reverted (#201) — GitHub mutes CI re-runs on `GITHUB_TOKEN` force-push, would need a PAT.
- 2026-05-02: **scripts/pr-watcher.sh** — cursor-based bash poller for PR comments + reviews, paired with Claude Code Monitor tool. ~100× token savings vs naive `/loop` polling (PR #190). Idempotent, `gh api --paginate` for >100-event tail safety, filtered by author exclusion.
- 2026-05-02: **#126** help-button hit-area to 44×44 via `before:` pseudo-element halo — visible 24×24 circle preserved, layout footprint unchanged, e2e exercises all 4 sides (PR #188).
- 2026-05-02: Stale `react-hooks/set-state-in-effect` disable in `usePuzzleLifecycle.ts:85` — plugin heuristic improved, no longer fires (PR #204).
- 2026-04-27: **#116** GameContainer refactor "gravity well" — extracted 4 hooks across 4 PRs: `useKeyboardShortcuts` (#183, −76 LOC), `useAutoStartIdle` (#184, −8), `useShare` (#185, −9), `usePuzzleLifecycle` (#186, −62). GameContainer 728 → 573 LOC (−21%). Each hook has unit tests.
- 2026-04-26: **#135** multi-tab race — `storage` event listener in `useDaily` (PR #172).
- 2026-04-26: **#131** locale-dependent action row wrap — split into primary + transient groups (PR #171).
- 2026-04-26: **#139** countdown 00:00:00 hang — visibility-gated interval (PR #170, completes the fix started in #148).
- 2026-04-26: **#140** `StreakBanner.stories.tsx` wrong types — canonical uppercase + correct `dayNumber` (PR #169).
- 2026-04-26: **#132** streak banner one giant button — decomposed so only the CTA is a `<button>` (PR #168).
- 2026-04-26: **#141** countdown `aria-hidden` (PR #167).
- 2026-04-25: **#145** difficulty change silently exits daily — explicit `confirmExitDaily` i18n (PR #166).
- 2026-04-25: **#133** New Game button no confirm — added missing guard (PR #165).
- 2026-04-25: **#115** knip cleanup — drop unused exports + fix config (PR #164).
- 2026-04-25: **#119** `.env` gitignore — preventive (PR #163).
- 2026-04-25: **#117** Resolve stale PR #76 — closed in favor of current single-reviewer setup.
- 2026-04-25: **#120** SHA-pin `anthropics/claude-code-action` (PR #157).
- 2026-04-25: **#143** Completion effect re-runs every second — `elapsedTimeRef` mirror, dropped from deps (PR #151).
- 2026-04-25: **#114** `tsc` 5 typecheck errors + add typecheck CI gate (PR #150).
- 2026-04-25: **#138** `dailyInfo` stale at midnight — `setTimeout`-based refresh + `visibilitychange` safety net (PR #148).
- 2026-04-25: **#136 #137 #142 #144** streak data-integrity cluster — future-date guard, drop `completedDates` array, store v1→v2 migration. #136 + #144 confirmed false positives, kept tests as regression guards (PR #147).
- 2026-04-25: **#121** Dependabot config for npm + github-actions (PR #152).
- 2026-04-25: **#122** Mobile streak banner truncation, **#126** ?-button touch target — covered by ongoing layout fixes.

## Notes

### 2026-05-01 / 02 session — SEO + tooling sprint

- ~13 PRs merged across two days. Closed `#23` (SEO) and `#116` (GameContainer refactor) — the two biggest open issues from the prior session.
- Heavy use of `/retro`, `/document-release`, and PR-watcher (own script) for review-loop hygiene. Auto Claude PR Review caught nits across the board.
- One bypass attempt during the dependabot cascade pain ("давай `--admin` merge"): user blocked it, correctly. Discipline held — every merge went through the strict-protection path with proper CI green.
- Auto-merge workflow experiment (#193, #198) revealed a hard limit: GitHub mutes downstream CI on `GITHUB_TOKEN` force-pushes (anti-recursion). The supported fix needs a PAT, which adds rotation/scope/leakage surface — explicitly declined in favor of manual "Update branch" UI clicks.

### 2026-04-25 / 26 session — design-review marathon

- gstack skills used heavily this cycle: `/health`, `/retro`, `/cso`, `/design-review`, `/qa-only`, `/codex challenge`. The marathon found 33 issues and shipped 17+ PRs over 2 days.
- Strict 1-PR-per-issue discipline (with one exception: timezone cluster bundled into PR #147 due to shared root cause).
- After review-cycle convergence (auto Claude PR Review action + my self-review on push) caught the same `confirmExitDaily` missing-key bug within ~1 second of each other on PR #166. Healthy redundancy.
