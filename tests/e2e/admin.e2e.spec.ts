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
  await expect(page.getByText(/gepubliceerd|published/i).first()).toBeVisible()
  await expect
    .poll(async () => (await (await request.get(`/api/pages?where[tenant.slug][equals]=e2e-${suffix}&depth=0`)).json()).docs.length)
    .toBe(1)
})

test('the assistant explains when no model is set up', async ({ page }) => {
  await login(page, user)
  await page.goto(`/admin/${site}/assistant`)
  await expect(page.getByText(/niet ingesteld|not set up/i)).toBeVisible()
})
