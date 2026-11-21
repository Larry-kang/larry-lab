import { expect, test } from '@playwright/test';

test('mortgage guide presets and explicit snapshot survive navigation', async ({ page }) => {
  await page.goto('/guides/mortgage/term/');
  await page.getByRole('link', { name: '將兩個方案套入房貸試算' }).click();
  const price = page.locator('input[data-path="scenarios.0.price"]');
  await expect(price).toHaveValue('15,000,000');
  await expect(page.getByRole('radio', { name: /40 年/ })).toBeVisible();
  await price.fill('16000000');
  await page.getByRole('button', { name: '儲存目前方案' }).click();
  await price.fill('17000000');
  await page.goto('/guides/mortgage/grace/');
  await page.getByRole('link', { name: '將兩個方案套入房貸試算' }).click();
  await expect(page.getByRole('radio', { name: /寬限期 2 年/ })).toBeVisible();
  await page.getByRole('button', { name: '載入已儲存方案' }).click();
  await expect(price).toHaveValue('16,000,000');
  await expect(page.getByRole('radio', { name: /40 年/ })).toBeVisible();
  await page.getByRole('button', { name: '清除已儲存方案' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '載入已儲存方案' })).toBeDisabled();
});
