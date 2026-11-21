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

test.describe('AI services', () => {
  test.describe.configure({ mode: 'serial' })
  const admin = { email: `e2e-admin-${suffix}@example.test`, password: randomUUID() }

  test.beforeAll(async () => {
    await payload.create({
      collection: 'users', overrideAccess: true, context: { bootstrapUser: true },
      data: { ...admin, role: 'platform-admin', tenants: [{ tenant: site, role: 'admin' }] },
    })
  })

  test.afterAll(async () => {
    await payload.delete({ collection: 'assistant-settings', overrideAccess: true, where: { tenant: { equals: site } } })
    await payload.delete({ collection: 'users', overrideAccess: true, where: { email: { equals: admin.email } } })
  })

  test('choosing a named service fills in its address and shows its name', async ({ page }) => {
    await login(page, admin)
    await page.goto(`/admin/${site}/settings/ai`)
    await page.getByRole('button', { name: /koppeling toevoegen|add connection/i }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('combobox', { name: /dienst|service/i }).click()
    await page.getByRole('option', { name: /^xAI \(Grok\)/ }).click()
    await expect(dialog.locator('#connection-label')).toHaveValue('xAI (Grok)')
    await expect(dialog.locator('#baseURL')).toHaveCount(0)
    await expect(dialog.getByRole('link', { name: /console\.x\.ai/ })).toHaveAttribute('href', 'https://console.x.ai')
    await dialog.locator('#apiKey').fill('xai-e2e-key')
    await dialog.getByRole('button', { name: /^(opslaan|save)$/i }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByText('xAI (Grok)', { exact: true }).last()).toBeVisible()

    const { docs: [settings] } = await payload.find({ collection: 'assistant-settings', overrideAccess: true, where: { tenant: { equals: site } } })
    expect(settings.connections?.[0]).toMatchObject({ provider: 'openai-compatible', baseURL: 'https://api.x.ai/v1', hasKey: true })
  })

  test('switching a saved connection to another service asks for a new key', async ({ page }) => {
    await login(page, admin)
    await page.goto(`/admin/${site}/settings/ai`)
    await page.getByRole('button', { name: /bewerken|edit/i }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('#apiKey')).not.toHaveAttribute('required')
    await dialog.getByRole('combobox', { name: /dienst|service/i }).click()
    await page.getByRole('option', { name: /^DeepSeek/ }).click()
    await expect(dialog.locator('#apiKey')).toHaveAttribute('required')
    await expect(dialog.getByText(/sleutel voor de nieuwe dienst|key for the new service/i)).toBeVisible()
  })
})
