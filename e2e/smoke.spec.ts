import { test, expect } from '@playwright/test';

test.describe('Sudoku Sensei – smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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

    // After placing 5, aria-label changes to include the value
    const filledCell = page.locator(`[aria-label="${emptyLabel}: 5"]`);
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

    // Find any filled cell (initial cells expose their value via aria-label "RxCy: N")
    const filledLabel = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="cell"]');
      for (const cell of cells) {
        const label = cell.getAttribute('aria-label') || '';
        if (/^R\dC\d: \d$/.test(label)) return label;
      }
      return null;
    });
    expect(filledLabel).not.toBeNull();
    const digit = filledLabel!.slice(-1);

    await page.locator(`[aria-label="${filledLabel}"]`).click();

    // At least one OTHER cell with the same digit should now have
    // cell-matching-value applied (the selected cell itself does not).
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

    // Re-select a cell with the same digit and confirm highlights stay off
    const sameDigitCell = await page.evaluate((d) => {
      const cells = document.querySelectorAll('[data-testid="cell"]');
      for (const cell of cells) {
        const label = cell.getAttribute('aria-label') || '';
        if (label.endsWith(`: ${d}`)) return label;
      }
      return null;
    }, digit);
    if (sameDigitCell) {
      await page.locator(`[aria-label="${sameDigitCell}"]`).click();
      await expect(page.locator('.cell-matching-value')).toHaveCount(0);
      await expect(page.locator('.cell-highlighted')).toHaveCount(0);
    }

    // Re-enable for the next test (toggle button starts pressed=false now)
    await toggle.click();
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
