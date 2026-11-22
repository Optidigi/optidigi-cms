import type { Page } from '@playwright/test'

/** Signs in through the admin login page and waits for a website overview. */
export async function login(page: Page, user: { email: string; password: string }) {
  await page.goto('/admin/login')
  // Two steps: the email address, then the password.
  await page.locator('#email').fill(user.email)
  await page.getByRole('button', { name: /^(doorgaan|continue)$/i }).click()
  await page.locator('#password').fill(user.password)
  await page.getByRole('button', { name: /inloggen|sign in/i }).click()
  await page.waitForURL(/\/admin\/\d+$/)
}
