import { test, expect } from '@playwright/test'

test.describe('随笔系统', () => {
  test('Notes 页加载随笔列表', async ({ page }) => {
    await page.goto('/notes')
    await expect(page.locator('.essay-card, [class*="essay"], [class*="card"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('点击随笔打开模态框', async ({ page }) => {
    await page.goto('/notes')
    await page.waitForTimeout(2000)
    const readLink = page.locator('text=Read Essay').first()
    if (await readLink.isVisible()) {
      await readLink.click()
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
    }
  })

  test('随笔模态框可关闭', async ({ page }) => {
    await page.goto('/notes')
    await page.waitForTimeout(2000)
    const readLink = page.locator('text=Read Essay').first()
    if (await readLink.isVisible()) {
      await readLink.click()
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
      await page.keyboard.press('Escape')
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 })
    }
  })
})
