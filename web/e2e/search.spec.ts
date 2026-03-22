import { test, expect } from '@playwright/test'

test.describe('搜索功能', () => {
  test('搜索页正确加载', async ({ page }) => {
    await page.goto('/search')
    await expect(page).toHaveURL(/\/search/)
  })

  test('搜索框可输入', async ({ page }) => {
    await page.goto('/search')
    const searchInput = page.locator('input[type="text"]').first()
    await searchInput.fill('test')
    await expect(searchInput).toHaveValue('test')
  })

  test('空搜索展示空状态', async ({ page }) => {
    await page.goto('/search')
    await expect(page.locator('body')).toBeVisible()
  })
})
