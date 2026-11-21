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
  // Members can't set AI up, so other pages show neither the prompt bar nor a set-up hint.
  await page.goto(`/admin/${site}/pages`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /vraag ai|ask ai/i })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /^(instellen|set up)$/i })).toHaveCount(0)
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

  test('platform administrators are pointed to AI settings until a model is set up', async ({ page }) => {
    await login(page, admin)
    await page.goto(`/admin/${site}/pages`)
    await expect(page.getByRole('textbox', { name: /vraag ai|ask ai/i })).toHaveCount(0)
    await page.getByRole('link', { name: /^(instellen|set up)$/i }).click()
    await page.waitForURL(`**/admin/${site}/settings/ai`)
    await expect(page.getByRole('link', { name: /^(instellen|set up)$/i })).toHaveCount(0)
  })

  test('choosing a named service fills in its address and shows its name', async ({ page }) => {
    await login(page, admin)
    await page.goto(`/admin/${site}/settings/ai`)
    await page.getByRole('button', { name: /koppeling toevoegen|add connection/i }).first().click()
    const dialog = page.getByRole('dialog')
    // Step 1: the services as choice cards.
    await dialog.getByRole('radio', { name: /^xAI \(Grok\)/ }).check()
    await dialog.getByRole('button', { name: /^(doorgaan|continue)$/i }).click()
    // Step 2: the details, with the chosen service on top.
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
    await page.getByRole('button', { name: /acties voor|actions for/i }).first().click()
    await page.getByRole('menuitem', { name: /bewerken|edit/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('#apiKey')).not.toHaveAttribute('required')
    await dialog.getByRole('button', { name: /^(wijzigen|change)$/i }).click()
    await dialog.getByRole('radio', { name: /^DeepSeek/ }).check()
    await dialog.getByRole('button', { name: /^(doorgaan|continue)$/i }).click()
    await expect(dialog.locator('#apiKey')).toHaveAttribute('required')
    await expect(dialog.getByText(/sleutel voor de nieuwe dienst|key for the new service/i)).toBeVisible()
  })

  test('the prompt bar offers a model choice when the website has several models', async ({ page }) => {
    const { docs: [settings] } = await payload.find({ collection: 'assistant-settings', overrideAccess: true, where: { tenant: { equals: site } } })
    const [connection] = settings.connections ?? []
    await payload.update({
      collection: 'assistant-settings', overrideAccess: true, id: settings.id,
      data: { connections: [{ id: connection.id, label: connection.label, provider: connection.provider, baseURL: connection.baseURL, models: ['model-a', 'model-b'] }] },
    })
    await page.setViewportSize({ width: 1280, height: 900 })
    await login(page, admin)
    await page.goto(`/admin/${site}/pages`)
    await expect(page.getByRole('textbox', { name: /vraag ai|ask ai/i })).toBeVisible()
    await page.getByRole('button', { name: /^(model)$/i }).click()
    await page.getByRole('menuitemradio', { name: 'model-b' }).click()
    await expect(page.getByRole('button', { name: /^(model)$/i })).toContainText('model-b')
  })

  test('a connection can be renamed, get a new key and be deleted after confirming', async ({ page }) => {
    await login(page, admin)
    await page.goto(`/admin/${site}/settings/ai`)
    await page.getByRole('button', { name: /acties voor|actions for/i }).first().click()
    await page.getByRole('menuitem', { name: /bewerken|edit/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('#connection-label').fill('Team Grok')
    await dialog.locator('#apiKey').fill('xai-new-key')
    await dialog.getByRole('button', { name: /^(opslaan|save)$/i }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByText('Team Grok', { exact: true })).toBeVisible()

    const before = (await payload.find({ collection: 'assistant-settings', overrideAccess: true, where: { tenant: { equals: site } } })).docs[0]
    const connection = before.connections![0]
    await payload.update({ collection: 'assistant-settings', overrideAccess: true, id: before.id, data: { defaultModel: `${connection.id}:model-a` } })
    await page.reload()

    await page.getByRole('button', { name: /acties voor team grok|actions for team grok/i }).click()
    await page.getByRole('menuitem', { name: /verwijderen|delete/i }).click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toContainText(/team grok/i)
    await expect(confirm).not.toContainText(/document/i)
    await confirm.getByRole('button', { name: /^(verwijderen|delete)$/i }).click()
    await expect(page.getByText('Team Grok', { exact: true })).toHaveCount(0)

    const after = (await payload.find({ collection: 'assistant-settings', overrideAccess: true, where: { tenant: { equals: site } } })).docs[0]
    expect(after.connections).toHaveLength(0)
    expect(after.defaultModel ?? null).toBeNull()
  })
})

test('the sidebar puts AI under the overview and settings at the bottom', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await login(page, user)
  await page.goto(`/admin/${site}`)
  const names = await page.locator('[data-sidebar="menu-button"]').evaluateAll((items) =>
    items.map((item) => item.textContent?.trim() ?? '').filter(Boolean),
  )
  const order = names.slice(1, -1) // without the website switcher and the account menu
  expect(order[0]).toMatch(/overzicht|overview/i)
  expect(order[1]).toMatch(/^ai$/i)
  expect(order.at(-1)).toMatch(/instellingen|settings/i)
  expect(order.at(-2)).toMatch(/website bekijken|view website/i)
  expect(order.some((name) => /^platform$/i.test(name))).toBe(false)
})

test('appearance choices apply at once and survive a reload', async ({ page }) => {
  await login(page, user)
  await page.goto('/admin/account/preferences')
  const html = page.locator('html')
  await page.getByRole('radio', { name: /^(blauw|blue)$/i }).check()
  await expect(html).toHaveAttribute('data-accent', 'blue')
  await page.getByRole('radio', { name: /^inter/i }).check()
  await expect(html).toHaveAttribute('data-font', 'inter')
  await page.getByRole('radio', { name: /^(groot|large)$/i }).check()
  await expect(html).toHaveAttribute('data-text-size', 'large')
  await page.getByRole('switch', { name: /minder beweging|reduce motion/i }).click()
  await expect(html).toHaveAttribute('data-reduce-motion', 'true')
  // Saves run in the background; wait until the last one is stored before reloading.
  await expect.poll(async () => {
    const { docs } = await payload.find({ collection: 'payload-preferences', overrideAccess: true, where: { key: { equals: 'cms' }, 'user.value': { equals: (await payload.find({ collection: 'users', overrideAccess: true, where: { email: { equals: user.email } } })).docs[0].id } } })
    return (docs[0]?.value as { reduceMotion?: boolean } | undefined)?.reduceMotion
  }).toBe(true)
  await page.reload()
  await expect(html).toHaveAttribute('data-accent', 'blue')
  await expect(html).toHaveAttribute('data-font', 'inter')
  await expect(html).toHaveAttribute('data-text-size', 'large')
  await expect(html).toHaveAttribute('data-reduce-motion', 'true')
  expect(await html.evaluate((element) => getComputedStyle(element).fontFamily)).toMatch(/inter/i)
})
