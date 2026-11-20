import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

test('the themed native tab styles Payload and links to the shared assistant', async ({
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
    data: { slug, name: 'Themed admin fixture', siteOrigin: 'https://example.com' },
  })

  try {
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { bootstrapUser: true },
      data: { email, password, role: 'customer', tenants: [{ tenant: tenant.id, role: 'admin' }] },
    })

    await page.goto('/admin-tweaked')
    await expect(page).toHaveURL(/\/admin\/login$/, { timeout: 30_000 })
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('html')).toHaveAttribute('data-admin-appearance', 'tweaked')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-admin-appearance', 'tweaked')
    await expect(page.locator('.native-theme-login-intro')).toHaveCount(0)

    const stock = await context.newPage()
    await stock.goto('/admin/login')
    await expect(stock.locator('.native-theme-login-intro')).toHaveCount(0)
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
    const assistantName = /^Open AI-assistent$|^Open AI assistant$/
    const assistantLink = page.getByRole('link', { name: assistantName })
    await expect(assistantLink).toHaveAttribute('href', `/admin-shadcn/${tenant.id}/assistant`)
    await expect(page.locator('nav a[href="/admin/collections/site-settings"]')).toBeVisible()
    await expect(page.locator('a[href="/admin/account"]')).toHaveCount(1)

    await stock.goto('/admin')
    await expect(stock.locator('nav a[href="/admin/collections/site-settings"]')).toBeVisible()
    await expect(stock.getByRole('link', { name: assistantName })).toHaveCount(0)
    await expect(stock.locator('html')).not.toHaveAttribute('data-admin-appearance', 'tweaked')
    await stock.close()

    await assistantLink.click()
    await expect(page).toHaveURL(`/admin-shadcn/${tenant.id}/assistant`, { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: 'AI-assistent' })).toBeVisible()

    await page.goto('/admin-tweaked?style=default')
    await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 })
    await expect(page.locator('html')).not.toHaveAttribute('data-admin-appearance', 'tweaked')
    await expect(assistantLink).toHaveCount(0)
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
