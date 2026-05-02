import { test, expect } from '@playwright/test';

test.describe('Sudoku Sensei – smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    // Skip the onboarding tour so it doesn't block pointer events during tests
    await page.addInitScript(() => {
      localStorage.setItem('sudoku-onboarding-done', 'true');
    });
    await page.goto('/');
  });

  // Clear any test-set localStorage so a failed test cannot leak state
  // (e.g. a disabled highlights toggle) into the next test in the run.
  test.afterEach(async ({ page }) => {
    try {
      await page.evaluate(() => localStorage.clear());
    } catch { /* page may already be closed */ }
  });

  test('app loads and renders 81 cells', async ({ page }) => {
    const cells = page.locator('[data-testid="cell"]');
    await expect(cells).toHaveCount(81);
  });

  test('select cell and enter digit via number pad', async ({ page }) => {
    // Wait for game to finish generating (initial cells appear)
    await expect(page.locator('.cell-initial').first()).toBeVisible({ timeout: 10000 });

    // Click an initial cell to confirm interactivity
    await page.locator('.cell-initial').first().click();

    // Find an empty cell via aria-label matching RxCy (no colon = no value)
    const emptyLabel = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="cell"]');
      for (const cell of cells) {
        const label = cell.getAttribute('aria-label') || '';
        if (/^R\dC\d$/.test(label)) return label;
      }
      return null;
    });
    expect(emptyLabel).not.toBeNull();

    const emptyCell = page.locator(`[aria-label="${emptyLabel}"]`);
    await emptyCell.click();

    // Wait for number pad to become enabled (cell selected + game playing)
    const numBtn = page.getByRole('button', { name: '5', exact: true });
    await expect(numBtn).toBeEnabled({ timeout: 5000 });

    // Click the number
    await numBtn.click();

    // After placing 5, aria-label starts with "RxCy: 5" (may have " (error)" suffix)
    const filledCell = page.locator(`[aria-label^="${emptyLabel}: 5"]`);
    await expect(filledCell).toHaveText('5', { timeout: 3000 });
  });

  test('type selector dropdown opens and closes', async ({ page }) => {
    const trigger = page.locator('[aria-haspopup="listbox"]');
    await expect(trigger).toBeVisible({ timeout: 5000 });
    await trigger.click();

    // Listbox should appear
    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible();

    // Click outside to close
    await page.mouse.click(10, 10);
    await expect(listbox).not.toBeVisible();
  });

  test('selecting a filled cell highlights matching digits, toggle persists', async ({ page }) => {
    // Wait for puzzle to render
    await expect(page.locator('.cell-initial').first()).toBeVisible({ timeout: 10000 });

    // Find a filled cell whose digit appears at least twice among the
    // givens. We need duplicates so that clicking it produces at least one
    // OTHER matching cell — picking the first filled cell would flake on
    // puzzles where its digit happens to be a single given.
    const filledLabel = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="cell"]');
      const counts = new Map<string, string[]>();
      for (const cell of cells) {
        const label = cell.getAttribute('aria-label') || '';
        const m = /^R\dC\d: (\d)$/.exec(label);
        if (m) {
          const d = m[1]!;
          if (!counts.has(d)) counts.set(d, []);
          counts.get(d)!.push(label);
        }
      }
      for (const labels of counts.values()) {
        if (labels.length >= 2) return labels[0];
      }
      return null;
    });
    expect(filledLabel).not.toBeNull();

    await page.locator(`[aria-label="${filledLabel}"]`).click();

    // At least one OTHER cell with the same digit should now have
    // cell-matching-value applied (the selected cell itself does not).
    // Guaranteed because we picked a digit with ≥2 givens above.
    const matchingCount = await page.locator('.cell-matching-value').count();
    expect(matchingCount).toBeGreaterThan(0);

    // Sanity check: peer cells in the same row/col/box also light up
    const highlightedCount = await page.locator('.cell-highlighted').count();
    expect(highlightedCount).toBeGreaterThan(0);

    // Toggle highlights off — the button lives inside the settings drawer,
    // so open it first via the gear icon.
    await page.locator('[data-testid="settings-gear"]').click();
    const toggle = page.locator('[data-testid="toggle-highlights"]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    // Close the drawer so it doesn't obscure subsequent assertions
    await page.keyboard.press('Escape');

    // After toggling off, no cell should carry either highlight class
    await expect(page.locator('.cell-matching-value')).toHaveCount(0);
    await expect(page.locator('.cell-highlighted')).toHaveCount(0);

    // Reload — the disabled state must persist via localStorage
    await page.reload();
    await expect(page.locator('.cell-initial').first()).toBeVisible({ timeout: 10000 });

    // After reload, click any initial cell — with highlights disabled,
    // no cell should carry either highlight class regardless of which
    // cell we click. Hunting for the same digit would silently skip the
    // assertion if no match exists; clicking any initial cell makes the
    // persistence check unconditional.
    await page.locator('.cell-initial').first().click();
    await expect(page.locator('.cell-matching-value')).toHaveCount(0);
    await expect(page.locator('.cell-highlighted')).toHaveCount(0);

    // afterEach clears localStorage so we don't need to manually re-enable
    // the toggle here.
  });

  test('new game button generates a fresh puzzle', async ({ page }) => {
    // Wait for game to load
    await expect(page.locator('.cell-initial').first()).toBeVisible({ timeout: 10000 });

    const newGameBtn = page.locator('[data-testid="new-game-button"]');
    await expect(newGameBtn).toBeVisible({ timeout: 5000 });
    await newGameBtn.click();

    // Grid should still have 81 cells after new game
    const cells = page.locator('[data-testid="cell"]');
    await expect(cells).toHaveCount(81);

    // Wait for new puzzle to load
    await expect(page.locator('.cell-initial').first()).toBeVisible({ timeout: 10000 });
  });

  test('how-to-play "?" button has a 44×44 touch target', async ({ page }) => {
    // #126: visible circle stays 24×24 (don't dominate the eyebrow row)
    // but the click/tap area must meet WCAG AA + iOS HIG 44×44 minimum.
    // Implemented via a `before:inset-[-10px]` pseudo-element that adds
    // a 10px transparent halo around the visible circle.
    const btn = page.locator('[data-testid="how-to-play-button"]');
    await expect(btn).toBeVisible({ timeout: 5000 });

    // Visible circle layout footprint stays 24×24
    const visualBox = await btn.boundingBox();
    expect(visualBox).not.toBeNull();
    expect(visualBox!.width).toBe(24);
    expect(visualBox!.height).toBe(24);

    // The pseudo-element must inset -10px on all sides so the effective
    // click area is 44×44 (24 + 10 + 10).
    const pseudoInsets = await btn.evaluate((el) => {
      const cs = getComputedStyle(el, '::before');
      return { top: cs.top, right: cs.right, bottom: cs.bottom, left: cs.left };
    });
    expect(pseudoInsets.top).toBe('-10px');
    expect(pseudoInsets.right).toBe('-10px');
    expect(pseudoInsets.bottom).toBe('-10px');
    expect(pseudoInsets.left).toBe('-10px');

    // Functional check: clicking 8px outside the visible circle on each
    // of the four sides still hits the button. The computed-style check
    // above proves the pseudo exists symmetrically; this proves the halo
    // is genuinely hit-testable on every side (catches a future change
    // that e.g. adds `pointer-events: none` to the pseudo). Target the
    // modal by its specific aria-labelledby (not the generic
    // [role="dialog"], which OnboardingTour also uses).
    await btn.scrollIntoViewIfNeeded();
    const dialog = page.locator('[aria-labelledby="htp-title"]');
    const closeDialog = async () => {
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden({ timeout: 1000 });
    };

    for (const side of ['left', 'right', 'top', 'bottom'] as const) {
      const fresh = await btn.boundingBox();
      expect(fresh).not.toBeNull();
      const cx = fresh!.x + fresh!.width / 2;
      const cy = fresh!.y + fresh!.height / 2;
      const off = 8; // 8px outside the visible 24×24 circle
      const pt =
        side === 'left'   ? { x: fresh!.x - off, y: cy } :
        side === 'right'  ? { x: fresh!.x + fresh!.width + off, y: cy } :
        side === 'top'    ? { x: cx, y: fresh!.y - off } :
                            { x: cx, y: fresh!.y + fresh!.height + off };

      await page.mouse.click(pt.x, pt.y);
      await expect(dialog, `halo click on ${side}`).toBeVisible({ timeout: 2000 });
      await closeDialog();
    }
  });

  test('SEO routes: /{lang}/{slug} forces variant; / redirects', async ({ page }) => {
    // #23 PR1: routing skeleton. Direct landings on a variant URL should
    // boot into that variant. Bare `/` redirects to `/{lang}` based on
    // localStorage / navigator.language.

    // Direct landing on /en/killer-sudoku starts a Killer puzzle.
    await page.goto('/en/killer-sudoku');
    await expect(page).toHaveURL(/\/en\/killer-sudoku$/);
    // Killer has 0 initial cells; wait for the type selector to update
    // instead. The selector text starts with "Killer" once newGame fires.
    await expect(
      page.locator('[aria-haspopup="listbox"]').first(),
    ).toContainText('Killer', { timeout: 10000 });

    // /ru/windoku boots into Windoku in Russian.
    await page.goto('/ru/windoku');
    await expect(page).toHaveURL(/\/ru\/windoku$/);
    await expect(
      page.locator('[aria-haspopup="listbox"]').first(),
    ).toContainText('Windoku', { timeout: 10000 });

    // Unknown slug bounces to /{lang} home.
    await page.goto('/en/totally-bogus');
    await expect(page).toHaveURL(/\/en$/);

    // Unknown language bounces to default (/en since fresh ctx → no
    // localStorage, navigator.language defaults to en in headless).
    await page.goto('/de/whatever');
    await expect(page).toHaveURL(/\/(en|ru)$/);

    // Bare / redirects.
    await page.goto('/');
    await expect(page).toHaveURL(/\/(en|ru)$/);
  });

  test('LanguageSwitcher updates the URL :lang segment', async ({ page }) => {
    await page.goto('/en/thermo-sudoku');
    await expect(page.locator('[aria-haspopup="listbox"]').first()).toContainText('Thermo', { timeout: 10000 });

    await page.locator('button[aria-label="Switch to RU"]').click();
    await expect(page).toHaveURL(/\/ru\/thermo-sudoku$/);

    await page.locator('button[aria-label="Switch to EN"]').click();
    await expect(page).toHaveURL(/\/en\/thermo-sudoku$/);
  });

  test('SEO meta: variant landing page emits per-variant title, meta, canonical, hreflang', async ({ page }) => {
    // PR2 of #23: per-route Helmet-equivalent meta via React 19 native
    // document-metadata hoisting.
    await page.goto('/en/killer-sudoku');
    await expect(page.locator('[aria-haspopup="listbox"]').first()).toContainText('Killer', { timeout: 10000 });

    // <title> includes the variant + brand suffix.
    await expect(page).toHaveTitle(/Killer.*Sudoku Sensei/);

    // <h1> matches the page topic — the page MUST have exactly one h1
    // (the variant name) so SEO crawlers index against the right intent.
    // :visible filters out the print-only h1 (hidden display:none on screen,
    // shown in print stylesheet). Crawlers honor display:none too; this is
    // what Googlebot indexes.
    const h1s = await page.locator('h1:visible').allTextContents();
    expect(h1s).toEqual(['Killer']);

    // <meta name="description"> reflects the variant.
    const descContent = await page.locator('head > meta[name="description"]').getAttribute('content');
    expect(descContent).toMatch(/Killer|cages/i);

    // Canonical URL points at the prod deploy, regardless of localhost.
    const canonicalHref = await page.locator('head > link[rel="canonical"]').getAttribute('href');
    expect(canonicalHref).toBe('https://leomo42.github.io/sudoku-cc/en/killer-sudoku');

    // hreflang alternates: at minimum en + ru + x-default.
    const hreflangs = await page.locator('head > link[rel="alternate"][hreflang]').evaluateAll((els) =>
      (els as HTMLLinkElement[]).map((el) => ({ lang: el.hreflang, href: el.href })),
    );
    expect(hreflangs).toContainEqual({ lang: 'en', href: 'https://leomo42.github.io/sudoku-cc/en/killer-sudoku' });
    expect(hreflangs).toContainEqual({ lang: 'ru', href: 'https://leomo42.github.io/sudoku-cc/ru/killer-sudoku' });
    expect(hreflangs).toContainEqual({ lang: 'x-default', href: 'https://leomo42.github.io/sudoku-cc/en/killer-sudoku' });

    // Switching to RU should swap title + canonical + h1 into Russian.
    await page.locator('button[aria-label="Switch to RU"]').click();
    await expect(page).toHaveURL(/\/ru\/killer-sudoku$/);
    await expect(page).toHaveTitle(/Sudoku Sensei/);
    const ruCanonical = await page.locator('head > link[rel="canonical"]').getAttribute('href');
    expect(ruCanonical).toBe('https://leomo42.github.io/sudoku-cc/ru/killer-sudoku');
  });

  test('variant landing page renders intro + rules block (PR5)', async ({ page }) => {
    // PR5 of #23: each /{lang}/{slug} renders <VariantLanding> between
    // the streak banner and the game — variant description + collapsible
    // rules. Reuses existing sudokuTypes.{X}.description and
    // howToPlay.variants.{X}.rules keys; no new strings.
    await page.goto('/en/killer-sudoku');
    const landing = page.locator('[data-testid="variant-landing"]');
    await expect(landing).toBeVisible({ timeout: 10000 });
    // Intro paragraph names the variant's defining mechanic.
    await expect(landing).toContainText(/cage/i);
    // Rules <details> block exists; content present in DOM (closed by
    // default doesn't hide from SEO crawlers — display:none does, but
    // <details> is just collapsed).
    await expect(landing.locator('details')).toBeAttached();
    await expect(landing.locator('details')).toContainText(/cage/i);
  });

  test('home route /{lang} renders HomeMeta + brand wordmark h1 (no landing copy)', async ({ page }) => {
    await page.goto('/en');
    // h1 = brand wordmark on home (no variant override).
    const h1s = await page.locator('h1:visible').allTextContents();
    expect(h1s).toEqual(['Sudoku']);
    // Title from i18n meta.home.title.
    await expect(page).toHaveTitle(/Sudoku Sensei.*13 Variant/);
    // Canonical points at the language home.
    const canonical = await page.locator('head > link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBe('https://leomo42.github.io/sudoku-cc/en');
    // Exactly one meta description (no duplicate from index.html anymore).
    const descCount = await page.locator('head > meta[name="description"]').count();
    expect(descCount).toBe(1);
    // No variant-landing copy on home — that's variant-routes-only.
    await expect(page.locator('[data-testid="variant-landing"]')).toHaveCount(0);
  });
});
