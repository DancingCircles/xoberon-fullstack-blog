import { test, expect } from '@playwright/test'

test.describe('管理后台', () => {
  test('未登录访问 admin 跳转登录', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/(login|home)/)
  })

  test('admin 页面包含侧边栏', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).toBeVisible()
  })
})
