import { expect, test } from '../helpers/test'

test('the CMS home redirects to the admin', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/admin(?:\/|$)/)
})
