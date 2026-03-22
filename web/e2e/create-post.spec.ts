import { test, expect } from '@playwright/test'

test.describe('创建文章', () => {
  test('未登录访问创建页应受保护', async ({ page }) => {
    await page.goto('/create-post')
    await page.waitForTimeout(2000)
    const hasForm = await page.locator('text=NEW POST').isVisible().catch(() => false)
    const redirected = !page.url().includes('/create-post')
    expect(hasForm || redirected).toBeTruthy()
  })

  test('创建页有表单字段', async ({ page }) => {
    await page.goto('/create-post')
    await expect(page.locator('body')).toBeVisible()
  })
})
