import { test, expect } from '@playwright/test'

test('the CMS home redirects to the admin', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/admin(?:\/|$)/)
})
