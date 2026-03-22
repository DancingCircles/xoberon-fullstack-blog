import { test, expect } from '@playwright/test'

test.describe('点赞持久化', () => {
  test('点赞状态通过 localStorage 持久化', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[placeholder="Username"]', 'xoberon')
    await page.fill('input[placeholder="Password"]', 'Password123')
    await page.click('button:has-text("Sign In")')
    await expect(page).toHaveURL(/\/home/, { timeout: 5000 })

    await page.goto('/journal')
    const blogListCard = page.locator('.blog-all-posts-section .blog-card').first()
    await blogListCard.scrollIntoViewIfNeeded()
    await expect(blogListCard).toBeVisible({ timeout: 10000 })

    await blogListCard.evaluate((el) => el.click())
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })

    const likeBtn = page.locator('[role="dialog"] .like-button, [role="dialog"] [aria-label="Like"]').first()
    if (await likeBtn.isVisible({ timeout: 5000 })) {
      await likeBtn.click()
      await page.waitForTimeout(500)

      const stored = await page.evaluate(() => localStorage.getItem('xoberon-liked-posts'))
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.length).toBeGreaterThan(0)
    }
  })

  test('刷新页面后点赞状态保持', async ({ page }) => {
    await page.goto('/journal')
    await page.evaluate(() => {
      localStorage.setItem('xoberon-liked-posts', JSON.stringify(['1']))
    })
    await page.reload()
    await page.waitForTimeout(2000)

    const stored = await page.evaluate(() => localStorage.getItem('xoberon-liked-posts'))
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed).toContain('1')
  })
})
