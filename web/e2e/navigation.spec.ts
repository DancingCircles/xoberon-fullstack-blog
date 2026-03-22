import { test, expect } from '@playwright/test'

test.describe('页面导航', () => {
  test('首页正确加载', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/home/)
    await expect(page.locator('nav')).toBeVisible()
  })

  test('/ 重定向到 /home', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/home/)
  })

  test('导航到 Journal 页', async ({ page }) => {
    await page.goto('/home')
    await page.click('text=JOURNAL')
    await expect(page).toHaveURL(/\/journal/)
  })

  test('导航到 Search 页', async ({ page }) => {
    await page.goto('/home')
    await page.click('text=SEARCH')
    await expect(page).toHaveURL(/\/search/)
  })

  test('导航到 Notes 页', async ({ page }) => {
    await page.goto('/home')
    await page.click('text=NOTES')
    await expect(page).toHaveURL(/\/notes/)
  })

  test('导航到 Contact 页', async ({ page }) => {
    await page.goto('/home')
    await page.click('text=CONTACT')
    await expect(page).toHaveURL(/\/contact/)
  })

  test('404 页面（不存在的路由）', async ({ page }) => {
    await page.goto('/this-does-not-exist')
    await expect(page.locator('text=404').first()).toBeVisible({ timeout: 10000 })
  })

  test('logo 点击导航到首页', async ({ page }) => {
    await page.goto('/notes')
    await page.click('.nav__logo a')
    await expect(page).toHaveURL(/\/home/)
  })
})
