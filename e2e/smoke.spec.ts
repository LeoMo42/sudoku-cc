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
});
