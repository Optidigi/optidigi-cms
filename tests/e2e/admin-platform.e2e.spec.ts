import { createHash, randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

test('platform administrator signs in through MCP consent and manages a website on mobile', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000)
  const payload = await getPayload({ config, key: randomUUID() })
  const slug = 'admin-qa-' + randomUUID()
  const email = slug + '@example.test'
  const password = randomUUID()
  const admin = await payload.create({
    collection: 'users',
    overrideAccess: true,
    context: { bootstrapUser: true },
    data: { email, password, role: 'platform-admin' },
  })
  try {
    const callback = 'https://example.com/oauth/callback'
    const registered = await context.request.post('/api/mcp/oauth/register', {
      data: { client_name: 'Release QA', redirect_uris: [callback] },
    })
    expect(registered.status()).toBe(201)
    const { client_id } = await registered.json()
    const query = new URLSearchParams({
      client_id,
      redirect_uri: callback,
      response_type: 'code',
      code_challenge_method: 'S256',
      code_challenge: createHash('sha256').update(randomUUID()).digest('base64url'),
    })
    await page.goto('/api/mcp/oauth/authorize?' + query)
    await expect(page).toHaveURL(/\/admin\/login\?redirect=/)
    await page.getByLabel('E-mailadres').fill(email)
    await page.getByLabel('Wachtwoord', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Inloggen', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/mcp\/authorize\?consent=/)
    await expect(
      page.getByRole('heading', { name: 'Allow Release QA to use your account?' }),
    ).toBeVisible()
    await page.route(callback + '**', (route) => route.fulfill({ body: 'Callback' }))
    await page.getByRole('button', { name: /deny/i }).click()
    await expect(page).toHaveURL(/error=access_denied/)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/admin/platform')
    await expect(page.getByRole('heading', { name: 'Platformbeheer' })).toBeVisible()
    await page.getByText('Website toevoegen', { exact: true }).click({ timeout: 15000 })
    await page.locator('input[name="name"]').fill('Release QA')
    await page.locator('input[name="slug"]').fill(slug)
    await page.locator('input[name="siteOrigin"]').fill('https://example.com')
    await page.getByRole('button', { name: 'Website opslaan' }).click()
    await expect(page).toHaveURL(/result=saved/)
    await expect(page.getByRole('link', { name: 'Release QA', exact: true }).first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  } finally {
    await payload.delete({
      collection: 'tenants',
      where: { slug: { equals: slug } },
      overrideAccess: true,
    })
    await payload.delete({ collection: 'users', id: admin.id, overrideAccess: true })
    await payload.destroy()
  }
})
