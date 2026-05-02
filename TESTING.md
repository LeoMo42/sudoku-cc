# Тестирование Sudoku Sensei

Тестовое покрытие — три слоя: unit (Vitest), e2e (Playwright), и drift-tests против build-time дубликации.

## Health stack (CI gates)

Все 7 gate'ов required для merge'а в `dev` (см. branch protection):

```bash
npx eslint .                                    # 0 warnings
npx tsc --noEmit                                # 0 errors
npx vitest run --config vitest.unit.config.ts   # все unit-тесты
npx vite build --base /sudoku-cc/               # production bundle
npx playwright test --project=chromium          # e2e
npx playwright test --project=firefox           # e2e
npx playwright test --project=webkit            # e2e
```

Дополнительно (опционально, не required):
- `npx knip` — мёртвый код
- `shellcheck scripts/*.sh` — bash linting

## Unit-тесты (Vitest)

228+ тестовых файлов в `src/**/*.test.ts(x)`. Покрытие сосредоточено на:

| Модуль | Покрытие |
|---|---|
| `src/utils/` | sudokuValidator, sudokuGenerator, hintEngine, dailyPuzzle, share, stats, bestTime, candidateGrid, seoUrls, variantSlugs |
| `src/hooks/` | каждый кастомный hook с фокус-тестами (useDaily, usePuzzleLifecycle, useShare, useAutoStartIdle, useTimer, useSound, useColorBlindMode, useHaptic, etc.) |
| `src/context/` | GameContext reducer (LOAD_STATE, NEW_GAME, SET_CELL_VALUE, etc.) + GameProvider integration |
| `src/components/` | Board, Cell, StreakBanner, OnboardingTour, SudokuTypeSelector |
| **Drift tests** | `variantSlugs.test.ts` + `seoUrls.test.ts` — TS↔MJS parity (slug list + `CANONICAL_BASE` совпадают между `.ts` source и `scripts/prerender.mjs`) |

Запуск:

```bash
npm run test         # watch
npm run test:run     # single pass (без timeout — vitest+jsdom иногда зависает после)
npm run test:ui      # UI runner
```

**Гэп: vitest+jsdom hang.** После завершения тестов vitest иногда не выходит — оборачивай в `timeout`:

```bash
timeout 180 npx vitest run --config vitest.unit.config.ts
```

## E2E (Playwright)

`e2e/smoke.spec.ts` покрывает критические user flows на трёх браузерах (chromium, firefox, webkit). 11 тестов:

| # | Тест | Что проверяет |
|---|---|---|
| 1 | App loads, 81 cells | Rendering + reducer init |
| 2 | Cell select + digit input | Click-to-select, NumberPad enable, board update |
| 3 | Type selector dropdown | Dropdown open/close, click-outside dismiss |
| 4 | Highlight + toggle persistence | Matching-value + peer highlight, settings drawer toggle, localStorage persistence across reload |
| 5 | New Game button | Fresh puzzle generation |
| 6 | Help-button 44×44 touch target | Visible 24×24 + `::before` halo, click hits all 4 sides, modal opens (issue #126) |
| 7 | SEO routes | `/{lang}/{slug}` forces variant, `/` redirects, unknown slugs/langs bounce |
| 8 | LanguageSwitcher | URL `:lang` segment swap |
| 9 | SEO meta on variant landing | per-variant title, single-h1, meta description, canonical, hreflang en/ru/x-default, locale swap correctness |
| 10 | Variant landing intro + rules block | `<VariantLanding>` visible на variant route, отсутствует на home |
| 11 | Home meta + h1 | `HomeMeta` rendering, brand wordmark h1, single meta description |

Запуск:

```bash
npx playwright test                              # all browsers
npx playwright test --project=chromium           # chromium only
npx playwright test e2e/smoke.spec.ts -g "SEO meta"  # фильтр
```

## Drift detection

Канонические URL'ы и slug-list дублированы между TypeScript исходниками и `.mjs` build script (Node-running ESM не может тривиально импортировать `.ts`). Drift ловится unit-тестами:

- `src/utils/variantSlugs.test.ts` — `VARIANT_SLUGS` в `.mjs` совпадает с TS source
- `src/utils/seoUrls.test.ts` — `CANONICAL_BASE` в `.mjs` совпадает

Если добавляешь slug в TS — добавь и в `.mjs` (drift test упадёт сам).

## Manual smoke

Перед production deploy проверь вручную:

1. **`/` redirect** — направляет на `/{en|ru}` по localStorage / navigator.language
2. **`/en/killer-sudoku`** — h1 = "Killer", cages видимы, intro paragraph + collapsible rules выше доски
3. **Switch language** — кнопка RU/EN меняет URL `:lang`, контент перерисовывается
4. **Dark mode toggle** — settings → dark mode, тема меняется, выживает reload
5. **Daily puzzle** — кликнуть Play today, completion → "Completed ✓" + countdown to midnight
6. **Print preview** — `Cmd+P` → board fills page, masthead скрыт, print-h1 видим

После deploy на GH Pages:
1. `view-source:https://leomo42.github.io/sudoku-cc/en/killer-sudoku` — `<title>`, `<meta description>`, `<h1>`, intro, rules, canonical, hreflang все в HTML до JS execution (это что crawler видит)
2. `curl https://leomo42.github.io/sudoku-cc/sitemap.xml` — 28 `<url>` блоков
3. Twitter Card Validator / Facebook Sharing Debugger — `og:image` thumbnail, title, description

## Известные ограничения

- **Generator runtime**: Killer + Sandwich иногда генерируют доску за 200-500ms. Не баг — backtracking + uniqueness check.
- **Vitest+jsdom zombie**: см. выше. Always wrap in `timeout`.
- **Onboarding tour blocks pointer events** в e2e: тесты делают `localStorage.setItem('sudoku-onboarding-done', 'true')` в `beforeEach`.
- **Some unit tests slow** (>30s) для uniqueness-проверки головоломок — оставлены в полном suite, но иногда лучше запускать с `-t` фильтром при разработке.

## Bug reports

Issue на GitHub с:
- Шаги воспроизведения
- Ожидаемое vs фактическое поведение
- Скриншот / video для visual bugs
- Browser + OS version
