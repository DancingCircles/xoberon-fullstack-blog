import { test, expect } from '@playwright/test'

async function injectAuthState(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem('xoberon-token', 'mock-contact-token')
    localStorage.setItem(
      'xoberon-user',
      JSON.stringify({
        id: 'contact-user',
        name: 'X',
        handle: '@x',
        bio: '',
        avatar: '',
        role: 'user',
        postCount: 0,
        essayCount: 0,
      }),
    )
  })
}

test.describe('联系表单', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact')
    await injectAuthState(page)
    await page.reload()
  })

  test('Contact 页正确渲染', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL(/\/contact/)
  })

  test('通过联系按钮打开模态框', async ({ page }) => {
    const contactBtn = page.locator('[aria-label="Contact Us"]').first()
    await contactBtn.scrollIntoViewIfNeeded()
    await contactBtn.click({ timeout: 15000 })
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })
  })

  test('空表单提交显示验证错误', async ({ page }) => {
    const contactBtn = page.locator('[aria-label="Contact Us"]').first()
    await contactBtn.scrollIntoViewIfNeeded()
    await contactBtn.click({ timeout: 15000 })
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })

    await page.click('text=SEND IT')
    const errors = page.locator('text=REQUIRED')
    await expect(errors.first()).toBeVisible()
  })

  test('无效邮箱提交显示错误', async ({ page }) => {
    const contactBtn = page.locator('[aria-label="Contact Us"]').first()
    await contactBtn.scrollIntoViewIfNeeded()
    await contactBtn.click({ timeout: 15000 })
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })

    await page.fill('#name', 'X')
    await page.fill('#email', 'bad-email')
    await page.fill('#message', 'Hello')
    await page.click('text=SEND IT')
    await expect(page.locator('text=INVALID EMAIL')).toBeVisible()
  })

  test('有效表单提交成功', async ({ page }) => {
    const contactBtn = page.locator('[aria-label="Contact Us"]').first()
    await contactBtn.scrollIntoViewIfNeeded()
    await contactBtn.click({ timeout: 15000 })
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })

    await page.fill('#name', 'X')
    await page.fill('#email', 'x@example.com')
    await page.fill('#message', 'Hello from E2E test')
    await page.click('text=SEND IT')

    await expect(page.locator('text=SENT!').first()).toBeVisible({ timeout: 5000 })
  })
})
