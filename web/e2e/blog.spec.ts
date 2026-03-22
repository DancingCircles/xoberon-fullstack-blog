import { test, expect } from '@playwright/test'

test.describe('博客功能', () => {
  test('博客列表页加载', async ({ page }) => {
    await page.goto('/journal')
    await expect(page.locator('.blog-card').first()).toBeVisible({ timeout: 10000 })
  })

  test('文章卡片显示标题和分类', async ({ page }) => {
    await page.goto('/journal')
    const firstCard = page.locator('.blog-card').first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })
    await expect(firstCard.locator('.blog-card-category')).toBeVisible()
    await expect(firstCard.locator('.blog-card-title')).toBeVisible()
  })

  test('点击文章打开模态框', async ({ page }) => {
    await page.goto('/journal')
    const blogListCard = page.locator('.blog-all-posts-section .blog-card').first()
    await blogListCard.scrollIntoViewIfNeeded()
    await expect(blogListCard).toBeVisible({ timeout: 10000 })
    await blogListCard.evaluate((el) => el.click())
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })
  })

  test('模态框可以通过 ESC 关闭', async ({ page }) => {
    await page.goto('/journal')
    const blogListCard = page.locator('.blog-all-posts-section .blog-card').first()
    await blogListCard.scrollIntoViewIfNeeded()
    await expect(blogListCard).toBeVisible({ timeout: 10000 })
    await blogListCard.evaluate((el) => el.click())
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 })
  })
})
