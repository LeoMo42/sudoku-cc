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

    // Toggle highlights off via the button (data-testid is stable across
    // future buttons that might also use aria-pressed).
    const toggle = page.locator('[data-testid="toggle-highlights"]');
    await expect(toggle).toBeVisible();
    await toggle.click();

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
});
