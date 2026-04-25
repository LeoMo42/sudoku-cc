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

_(none — green light)_

## P1 — Urgent

- [ ] **#116** Refactor `GameContainer.tsx` — gravity well, 22 commits in 14d. Split into `usePuzzleLifecycle`, `useGameMounts`, drop sub-components. Goal: < 200 LOC, < 5 commits/14d.
- [ ] **#125** Replace `system-ui` font stack with a real typeface (Manrope + JetBrains Mono). Single biggest AI-slop signal.
- [ ] **#127** Color discipline — pick one primary accent. Today 5 saturated colors compete (blue, purple, orange, red, violet).
- [ ] **#124** Streak banner reads as notice bar, not hero. After #125/#127 land, redesign banner with a real hero proportion.

## P2 — Important

- [ ] **#146** Russian plurals (`_one`/`_few`/`_many`) on `daily.streak`. Currently sneaks past with abbreviation `дн.`.
- [ ] **#134** Investigate "Select a cell" hint persistence — possibly a synthesized-click testing artifact, possibly a real bug. Verify with manual interaction first.
- [ ] **#130** "Sudoku" wordmark has zero brand character. Pairs with #125 typography.
- [ ] **#129** Keyboard hint text below number pad — move to a `?` tooltip or HowToPlayModal.
- [ ] **#128** Time/Mistakes card is 50% empty + settings cog placement confusing.
- [ ] **#123** Type card visual treatment inconsistent with Difficulty pills.
- [ ] **#102** Make daily puzzle streak the hero of the UI (covered partly by #124).

## P3 — Nice to have

- [ ] **#23** SEO: per-variant landing pages with i18n routing.
- [ ] Uninstall `@testing-library/user-event` (in `ignoreDependencies` per knip but actually unused — see knip.json comment).

## Completed

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

- gstack skills used heavily this cycle: `/health`, `/retro`, `/cso`, `/design-review`, `/qa-only`, `/codex challenge`. The marathon found 33 issues and shipped 17+ PRs over 2 days.
- Strict 1-PR-per-issue discipline (with one exception: timezone cluster bundled into PR #147 due to shared root cause).
- After review-cycle convergence (auto Claude PR Review action + my self-review on push) caught the same `confirmExitDaily` missing-key bug within ~1 second of each other on PR #166. Healthy redundancy.
