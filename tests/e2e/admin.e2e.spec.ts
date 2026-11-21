import { expect, test } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config.js'
import { login } from '../helpers/login'

const suffix = randomUUID().slice(0, 8)
const user = { email: `e2e-${suffix}@example.test`, password: randomUUID() }
let payload: Payload
let site: number

test.beforeAll(async () => {
  payload = await getPayload({ config })
  site = (await payload.create({
    collection: 'tenants', overrideAccess: true,
    data: { name: `E2E ${suffix}`, slug: `e2e-${suffix}`, siteOrigin: 'https://example.com' },
  })).id
  await payload.create({
    collection: 'users', overrideAccess: true, context: { bootstrapUser: true },
    data: { ...user, role: 'customer', tenants: [{ tenant: site, role: 'admin' }] },
  })
})

test.afterAll(async () => {
  await payload.delete({ collection: 'pages', overrideAccess: true, where: { tenant: { equals: site } } })
  await payload.delete({ collection: 'users', overrideAccess: true, where: { email: { equals: user.email } } })
  await payload.delete({ collection: 'tenants', overrideAccess: true, id: site })
})

test('an editor creates, saves and publishes a page that websites can read', async ({ page, request }) => {
  await login(page, user)
  await page.goto(`/admin/${site}/pages`)
  await page.getByRole('link', { name: /^(nieuw|new)$/i }).click()
  await page.locator('#title').fill('Over ons')
  await expect(page.locator('#slug')).toHaveValue('over-ons')
  await page.getByRole('button', { name: /concept opslaan|save draft/i }).first().click()
  await page.waitForURL(/\/pages\/\d+/)

  const published = await request.get(`/api/pages?where[tenant.slug][equals]=e2e-${suffix}&depth=0`)
  expect((await published.json()).docs).toHaveLength(0)

  await page.getByRole('button', { name: /publiceren|publish/i }).first().click()
  await expect(page.getByText(/gepubliceerd|published/i).locator('visible=true').first()).toBeVisible()
  await expect
    .poll(async () => (await (await request.get(`/api/pages?where[tenant.slug][equals]=e2e-${suffix}&depth=0`)).json()).docs.length)
    .toBe(1)
})

test('the assistant explains when no model is set up', async ({ page }) => {
  await login(page, user)
  await page.goto(`/admin/${site}/ai`)
  await expect(page.getByText(/niet ingesteld|not set up/i)).toBeVisible()
})

test('sections a website does not use are hidden and unreachable', async ({ page }) => {
  await login(page, user)
  await expect(page.getByRole('link', { name: /^(pagina’s|pages)$/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /^portfolio$/i })).toHaveCount(0)
  const response = await page.goto(`/admin/${site}/portfolio`)
  expect(response?.status()).toBe(404)
})

test('website members see AI connections read-only and never a key', async ({ page }) => {
  const settings = await payload.create({
    collection: 'assistant-settings', overrideAccess: true,
    data: { tenant: site, connections: [{ label: 'Team model', provider: 'anthropic', models: ['model-x'], apiKey: 'sk-e2e-secret' }] },
  })
  try {
    await login(page, user)
    await page.goto(`/admin/${site}/settings/ai`)
    await expect(page.getByText('Team model')).toBeVisible()
    await expect(page.getByText('model-x', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /koppeling toevoegen|add connection/i })).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('sk-e2e-secret')
  } finally {
    await payload.delete({ collection: 'assistant-settings', overrideAccess: true, id: settings.id })
  }
})
