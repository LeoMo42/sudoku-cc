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

    // Find an empty cell's aria-label from the DOM, then click by that label
    const emptyLabel = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="cell"]');
      for (const cell of cells) {
        const label = cell.getAttribute('aria-label') || '';
        if (!label.includes(':')) return label;
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
    // Mobile viewport shows the dropdown
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

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

  test('new game button generates a fresh puzzle', async ({ page }) => {
    // Wait for game to load
    await expect(page.locator('.cell-initial').first()).toBeVisible({ timeout: 10000 });

    const newGameBtn = page.getByRole('button', { name: /new.*game|новая.*игра/i });
    await expect(newGameBtn).toBeVisible({ timeout: 5000 });
    await newGameBtn.click();

    // Grid should still have 81 cells after new game
    const cells = page.locator('[data-testid="cell"]');
    await expect(cells).toHaveCount(81);
  });
});
