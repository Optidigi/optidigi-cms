import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

test('the themed native sign-in and settings use the stock Payload session', async ({
  context,
  page,
}) => {
  test.setTimeout(90_000)
  const payload = await getPayload({ config, key: randomUUID() })
  const slug = 'themed-' + randomUUID()
  const email = slug + '@example.test'
  const password = randomUUID()
  const tenant = await payload.create({
    collection: 'tenants',
    overrideAccess: true,
    data: { slug, name: 'Themed settings fixture', siteOrigin: 'https://example.com' },
  })

  try {
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { bootstrapUser: true },
      data: { email, password, role: 'customer', tenants: [{ tenant: tenant.id, role: 'admin' }] },
    })

    await page.goto('/admin-tweaked')
    const intro = page.getByRole('heading', { name: /Inloggen bij Optidigi|Sign in to Optidigi/ })
    await expect(intro).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('html')).toHaveAttribute('data-admin-appearance', 'tweaked')
    await page.reload()
    await expect(intro).toBeVisible()

    const stock = await context.newPage()
    await stock.goto('/admin/login')
    await expect(stock.locator('.native-theme-login-intro')).toBeHidden()
    await expect(stock.locator('html')).not.toHaveAttribute('data-admin-appearance', 'tweaked')
    const submit = page.locator('button[type="submit"]')
    const stockColor = await stock
      .locator('button[type="submit"]')
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(await submit.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(stockColor)

    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await submit.click()
    await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 })
    const settingsLink = page.getByRole('link', { name: /^(Instellingen|Settings)$/ })
    await expect(settingsLink).toBeVisible()
    await settingsLink.click()

    await expect(page).toHaveURL(/\/admin\/settings$/)
    await expect(
      page.getByRole('heading', { name: /Platformbeheer|Platform administration/ }),
    ).toHaveCount(0)
    await expect(page.locator('a[href="/admin/collections/site-settings"]').last()).toBeVisible()
    await expect(page.locator('a[href="/admin/assistant?settings=model"]')).toBeVisible()
    await expect(page.locator('a[href="/admin/account"]').last()).toBeVisible()

    await stock.goto('/admin')
    await expect(stock.getByRole('link', { name: /^(Instellingen|Settings)$/ })).toBeVisible()
    await expect(stock.locator('html')).not.toHaveAttribute('data-admin-appearance', 'tweaked')
    await stock.close()

    await page
      .getByRole('link', {
        name: /Terug naar de standaardweergave|Return to the default appearance/,
      })
      .click()
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.locator('html')).not.toHaveAttribute('data-admin-appearance', 'tweaked')
  } finally {
    await payload.delete({
      collection: 'users',
      where: { email: { equals: email } },
      overrideAccess: true,
    })
    await payload.delete({ collection: 'tenants', id: tenant.id, overrideAccess: true })
    await payload.destroy()
  }
})
