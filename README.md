# Sudoku Sensei

Браузерная игра в судоку с **13 вариантами правил**, ежедневной головоломкой со streak'ом и i18n. Чистый клиент-сайд (React 19 + Vite + TypeScript), деплой на GitHub Pages с pre-rendered статикой для каждого варианта.

🎮 [leomo42.github.io/sudoku-cc](https://leomo42.github.io/sudoku-cc/)

## Возможности

### Игровой движок
- ✅ **13 вариантов** — Classic, Diagonal, Windoku, Killer, Thermo, Sandwich, Anti-Knight, Anti-King, Odd-Even, Kropki, Greater-Than, Non-Consecutive, Little-Killer
- ✅ **4 уровня сложности** — от Легкого (40-50 заполненных ячеек, 5 подсказок) до Эксперта (20-25, 3 подсказки)
- ✅ **Система подсказок** с pedagogically-graded техниками (Naked Single → X-Wing → XYZ-Wing) и читаемыми объяснениями
- ✅ **Режим заметок** для записи кандидатов
- ✅ **Undo/Redo** через историю снимков
- ✅ **Mistake limit** опциональный — после N ошибок игра завершается

### Daily puzzle
- ✅ **Ежедневная головоломка** — детерминированная по UTC date-based seed, одинаковая для всех игроков
- ✅ **Streak** с countdown'ом до следующей и cross-tab sync через `storage` event

### UX
- ✅ **i18n** — английский + русский с правильными plural forms, locale-aware форматирование
- ✅ **Dark / light mode** с no-flash инициализацией до hydrate'а
- ✅ **Color-blind mode** — distinguishable cell highlights без зависимости от hue
- ✅ **Звук + haptic feedback** (для устройств с vibration API)
- ✅ **Confetti animation** при победе (с опт-аутом)
- ✅ **Onboarding tour** с spotlight cutout и keyboard navigation
- ✅ **Print layout** — оптимизирован для печати на бумаге
- ✅ **Share** через navigator.share / clipboard fallback

### SEO + Routing
- ✅ **Per-variant landing pages** — `/{lang}/{slug}` × 26 URL'ов с уникальными meta (title, description, canonical, hreflang)
- ✅ **Static prerender** — 28 HTML файлов на билде через headless Chromium, crawler-ready без JS execution
- ✅ **sitemap.xml + robots.txt** автогенерация
- ✅ **Per-variant intro + rules block** outside the game UI

### Persistence + accessibility
- ✅ **Автосохранение** в localStorage с migration support
- ✅ **Stats tracking** — best time, games started/completed, mistakes per variant×difficulty
- ✅ **WCAG AA** — 44×44 touch targets, sr-only labels, keyboard navigation
- ✅ **Клавиатурная навигация**: `1-9` ввод, `Стрелки` навигация, `Backspace/Delete` очистка, `N` режим заметок, `Ctrl+Z`/`Ctrl+Y` undo/redo

## Установка и запуск

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка для production
npm run build

# Preview production build
npm run preview

# Запуск Storybook (компоненты)
npm run storybook

# Сборка Storybook
npm run build-storybook

# Запуск тестов
npm run test         # Watch mode
npm run test:run     # Run once
npm run test:ui      # UI interface
```

## Технологический стек

- **React 19** + **TypeScript 5.9** (pinned — см. `tsconfig.json` про несовместимость TS 6 с `@typescript-eslint` v8)
- **Vite 7** — build tool
- **react-router-dom 7** — `/{lang}` + `/{lang}/{slug}` routing
- **react-i18next 16** — en/ru locales с plural forms
- **Tailwind CSS 4** — CSS-native config через `@theme` block, нет `tailwind.config.js`
- **Context API + useReducer** — state management
- **Manrope Variable + JetBrains Mono Variable** — self-hosted variable fonts через `@fontsource-variable`
- **Vitest** — unit tests
- **Playwright** — e2e + prerender движок
- **Storybook 10** — изолированная разработка компонентов
- **GitHub Pages** — деплой через `dist/` static + per-variant prerendered HTML

## Архитектура проекта

```
src/
├── App.tsx                       # BrowserRouter + GameProvider + ErrorBoundary
├── main.tsx
├── index.css                     # Tailwind 4 @import + @theme + @custom-variant dark
├── components/
│   ├── Board/                    # Игровое поле и ячейки
│   │   ├── Board.tsx
│   │   └── Cell.tsx              # React.memo + кастомное сравнение для 81 экземпляра
│   ├── Controls/                 # Элементы управления
│   │   ├── DifficultySelector.tsx
│   │   ├── GameControls.tsx
│   │   ├── GameOverModal.tsx
│   │   ├── HintModal.tsx
│   │   ├── HowToPlayModal.tsx
│   │   ├── NumberPad.tsx
│   │   ├── SudokuTypeSelector.tsx
│   │   └── Timer.tsx
│   ├── Game/
│   │   └── GameContainer.tsx     # Layout + JSX композиция; вся логика — в hooks/
│   ├── Routes/                   # SEO routing (issue #23)
│   │   ├── HomeMeta.tsx          # /{lang} — site-wide title/meta/canonical
│   │   ├── HomePage.tsx          # /{lang} route
│   │   ├── LandingMeta.tsx       # /{lang}/{slug} — per-variant title/meta/canonical/hreflang
│   │   ├── LanguageBridge.tsx    # синхронизация URL :lang → i18next
│   │   ├── RootRedirect.tsx      # / → /{detectedLang}
│   │   ├── VariantLanding.tsx    # intro paragraph + collapsible rules per variant
│   │   └── VariantPage.tsx       # /{lang}/{slug} route
│   └── UI/
│       ├── Button.tsx
│       ├── ErrorBoundary.tsx
│       ├── LanguageSwitcher.tsx  # Меняет URL :lang segment, не вызывает i18n.changeLanguage напрямую
│       ├── Modal.tsx
│       ├── OddEvenLegend.tsx
│       ├── OnboardingTour.tsx
│       ├── SettingsDrawer.tsx
│       ├── ShareToast.tsx
│       ├── StatsModal.tsx
│       └── StreakBanner.tsx
├── context/
│   └── GameContext.tsx           # Reducer + lazy initial state from localStorage
├── hooks/                        # Каждый — сфокусированный концерн
│   ├── useAutoStartIdle.ts       # Mount-time auto-start с forcedVariant priority
│   ├── useCelebrationSetting.ts
│   ├── useColorBlindMode.ts
│   ├── useConfetti.ts
│   ├── useDaily.ts               # Daily puzzle + streak + cross-tab sync
│   ├── useGameState.ts
│   ├── useHaptic.ts
│   ├── useHighlightSetting.ts
│   ├── useHowToPlay.ts
│   ├── useKeyboardShortcuts.ts   # Undo/redo + cell input
│   ├── useLanguageSync.ts        # URL :lang → i18next.changeLanguage
│   ├── useMistakeLimit.ts
│   ├── useOnboardingTour.ts
│   ├── usePuzzleLifecycle.ts     # 4 newGame entry-points + daily-completion routing
│   ├── useShare.ts               # handleShare + 2.5s "copied" toast state
│   ├── useSound.ts
│   ├── useStats.ts
│   ├── useTheme.ts
│   └── useTimer.ts
├── i18n/locales/                 # en + ru с plural forms
│   ├── en.json
│   └── ru.json
├── types/index.ts                # Shared types (GameState, GameActions, SudokuTypeId, etc.)
└── utils/
    ├── bestTime.ts
    ├── candidateGrid.ts
    ├── constants.ts              # GAME_STATUS, DIFFICULTY_LEVELS, SUDOKU_TYPES, STORAGE_KEY
    ├── dailyPuzzle.ts            # UTC dayNumber, store v1→v2 migration, future-date guard
    ├── hintEngine.ts             # Solver chain: Naked Single → X-Wing → XYZ-Wing
    ├── seededRandom.ts
    ├── seoUrls.ts                # canonicalUrl, hreflangAlternates, OG_IMAGE_URL
    ├── share.ts                  # navigator.share / clipboard fallback
    ├── stats.ts                  # gamesStarted/Completed, totalTime, totalMistakes
    ├── sudokuGenerator.ts        # createPuzzle per variant
    ├── sudokuSolver.ts           # backtracking + uniqueness check
    ├── sudokuValidator.ts        # findConflicts + isSolved per variant
    └── variantSlugs.ts           # SudokuTypeId ↔ URL slug + supported langs

scripts/
├── prerender.mjs                 # Vite preview + Playwright crawl + sitemap.xml + robots.txt
└── pr-watcher.sh                 # PR review poller (см. ниже)
```

## Алгоритмы

### Генерация головоломок
1. Создание полностью заполненной валидной доски (заполнение диагональных блоков + backtracking)
2. Удаление чисел с проверкой единственности решения

### Решение головоломок
Использует рекурсивный backtracking алгоритм для поиска решения

### Валидация
Проверка корректности хода с учетом правил Sudoku (строка, столбец, блок 3x3)

## Storybook - Документация компонентов

Проект включает Storybook для разработки и документирования компонентов в изоляции.

### Запуск Storybook:
```bash
npm run storybook
```

Откроется http://localhost:6006/ (или 6007, если 6006 занят)

### Доступные stories:

**UI компоненты:**
- Button - Кнопки с вариантами (primary, secondary, success, danger)
- Modal - Модальные окна
- StreakBanner - Баннер ежедневной серии (активное/завершённое состояние)
- ErrorBoundary - Обработка ошибок
- LanguageSwitcher - Переключатель языка
- OddEvenLegend - Легенда чёт/нечет

**Board компоненты:**
- Cell - Отдельная ячейка судоку (с различными состояниями)
- Board - Игровое поле 9x9

**Controls:**
- Timer - Отображение времени
- NumberPad - Панель ввода чисел
- DifficultySelector - Выбор уровня сложности
- SudokuTypeSelector - Выбор типа судоку
- GameControls - Кнопки управления игрой
- GameOverModal - Модалка завершения игры
- HintModal - Модалка подсказок

Каждая story включает:
- Интерактивные контролы для изменения props
- Несколько вариантов компонента в разных состояниях
- Автодокументацию

## SEO + Static Prerender

Каждый из 26 вариантных URL'ов (`/{lang}/{slug}`) рендерится в статический HTML на билде. Crawler-ready на первом запросе, без ожидания JS execution.

```bash
# Билд: vite + 28-route prerender + sitemap.xml + robots.txt
npx vite build --base /sudoku-cc/
PRERENDER_BASE=/sudoku-cc/ npm run prerender
```

Output:
```
dist/index.html                    # SPA shell (для root + 404 fallback)
dist/404.html                      # Copy of index.html — GH Pages SPA fallback
dist/{en,ru}/index.html            # Home pages (HomeMeta + game)
dist/{en,ru}/{slug}/index.html × 26  # Variant landing pages (LandingMeta + intro/rules + game)
dist/sitemap.xml                   # 28 URLs с hreflang альтернатами
dist/robots.txt                    # Allow + Sitemap pointer
```

`scripts/prerender.mjs` крутит headless Chromium через Playwright (уже dep для e2e). Curtain conditions: ждёт `<meta name="description">` + 81 cell. Идемпотентен. Drift-detection между slug list в `.ts` и `.mjs` ловится unit-тестами.

## Производительность

- **React.memo** для Cell компонента (оптимизация 81 экземпляра)
- **useCallback** для обработчиков событий
- Кастомная функция сравнения для мемоизации Cell
- **Static prerender** убирает JS execution wait для landing pages — first contentful paint по сети cache, не CPU
- **TypeScript compile + Vite rolldown bundler** — production build ~600ms, ~447 kB raw / 137 kB gzip JS

## Инструменты разработки

### `scripts/pr-watcher.sh` — фоновый поллер ревью PR

Опрашивает GitHub API для всех моих открытых PR и пишет новые комменты / ревью одной JSON-строкой за событие в `~/.pr-inbox/inbox.jsonl`. Парный с `tail -F` (или Monitor в Claude Code) — AI получает уведомление только когда есть что смотреть, без расходов токенов на пустые опросы.

```bash
# Один проход, выйти
./scripts/pr-watcher.sh

# Watch-режим, опрашивать каждые 600 секунд
./scripts/pr-watcher.sh --watch

# С кастомным интервалом (300 сек)
./scripts/pr-watcher.sh --watch 300
```

State в `~/.pr-inbox/`: `inbox.jsonl` (append-only, можно читать и чистить), `cursors/pr-N.txt` (last-seen ISO timestamp per PR), `.last-poll` (debug). Требует `gh` (авторизованный) и `jq`.

Фильтрация: всё кроме комментов автора репо. Чтобы расширить — `EXCLUDE_AUTHORS` в скрипте.

## Лицензия

MIT
