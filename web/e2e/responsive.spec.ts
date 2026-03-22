import { test, expect } from '@playwright/test'

test.describe('响应式布局', () => {
  test('移动端导航正确展示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/home')
    await expect(page.locator('nav')).toBeVisible()
  })

  test('平板端导航正确展示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/home')
    await expect(page.locator('nav')).toBeVisible()
  })

  test('桌面端导航正确展示', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/home')
    await expect(page.locator('nav')).toBeVisible()
  })
})
