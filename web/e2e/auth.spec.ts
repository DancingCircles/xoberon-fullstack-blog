import { test, expect } from '@playwright/test'

async function readCaptchaCode(page: import('@playwright/test').Page): Promise<string> {
  const captchaImg = page.locator('img[alt="验证码"]')
  await expect(captchaImg).toBeVisible({ timeout: 5000 })
  const src = await captchaImg.getAttribute('src')
  if (!src) {
    throw new Error('captcha image src not found')
  }
  const encodedSvg = src.split(',')[1] ?? ''
  const decodedSvg = decodeURIComponent(encodedSvg)
  const match = decodedSvg.match(/>([A-Z0-9]{4})<\/text>/)
  if (!match?.[1]) {
    throw new Error('captcha code not found in svg')
  }
  return match[1]
}

test.describe('认证流程', () => {
  test('登录页渲染正确', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[placeholder="Username"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Password"]')).toBeVisible()
  })

  test('注册新账号', async ({ page }) => {
    await page.goto('/login')
    await page.click('text=Sign Up')
    await expect(page.locator('input[placeholder="Username"]')).toBeVisible()

    await page.fill('input[placeholder="Username"]', 'TestUser')
    await page.fill('input[placeholder="Email"]', `test${Date.now()}@e2e.com`)
    await page.fill('input[placeholder="Password"]', 'TestPass1')
    const captchaCode = await readCaptchaCode(page)
    await page.fill('input[placeholder="验证码"]', captchaCode)

    await page.click('button:has-text("Sign Up")')

    await expect(page).toHaveURL(/\/home/, { timeout: 5000 })
  })

  test('登录已有账号', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[placeholder="Username"]', 'xoberon')
    await page.fill('input[placeholder="Password"]', 'Password123')
    await page.click('button:has-text("Sign In")')
    await expect(page).toHaveURL(/\/home/, { timeout: 5000 })
  })

  test('登录失败显示错误提示', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[placeholder="Username"]', 'doesnotexist')
    await page.fill('input[placeholder="Password"]', 'WrongPass1')
    await page.click('button:has-text("Sign In")')

    const toast = page.locator('.toast, [class*="toast"]').first()
    await expect(toast).toBeVisible({ timeout: 5000 })
  })

  test('密码可见性切换', async ({ page }) => {
    await page.goto('/login')
    const pwInput = page.locator('input[placeholder="Password"]')
    await expect(pwInput).toHaveAttribute('type', 'password')

    await page.click('[aria-label="Show password"]')
    await expect(pwInput).toHaveAttribute('type', 'text')

    await page.click('[aria-label="Hide password"]')
    await expect(pwInput).toHaveAttribute('type', 'password')
  })
})
