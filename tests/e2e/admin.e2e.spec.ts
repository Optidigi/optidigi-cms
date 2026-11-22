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
  await expect(page.getByRole('link', { name: /koppel een ai-model|connect an ai model/i })).toHaveCount(0)
  // The overview says so in a pill, without a prompt.
  await page.goto(`/admin/${site}`)
  await expect(page.getByText(/ingesteld door je beheerder|set up by your administrator/i)).toBeVisible()
  await expect(page.getByRole('textbox', { name: /vraag ai|ask ai/i })).toHaveCount(0)
})

test('sections a website does not use are hidden and unreachable', async ({ page }) => {
  await login(page, user)
  await expect(page.getByRole('link', { name: /^website$/i })).toBeVisible()
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
    await page.getByRole('link', { name: /koppel een ai-model|connect an ai model/i }).click()
    await page.waitForURL(`**/admin/${site}/settings/ai`)
    await expect(page.getByRole('link', { name: /koppel een ai-model|connect an ai model/i })).toHaveCount(0)
    // On the overview: the same pill above the heading and the prompt greyed out.
    await page.goto(`/admin/${site}`)
    await expect(page.getByRole('link', { name: /koppel een ai-model|connect an ai model/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /vraag ai|ask ai/i })).toBeDisabled()
  })

  test('choosing a named service fills in its address and shows its name', async ({ page }) => {
    await login(page, admin)
    await page.goto(`/admin/${site}/settings/ai`)
    await page.getByRole('button', { name: /koppeling toevoegen|add connection/i }).first().click()
    const dialog = page.getByRole('dialog')
    // Step 1: the services as choice cards; xAI sits under "More services", folded by default.
    await expect(dialog.getByRole('radio', { name: /^xAI \(Grok\)/ })).toHaveCount(0)
    await dialog.getByRole('button', { name: /meer diensten|more services/i }).click()
    await dialog.locator('label', { has: page.getByRole('radio', { name: /^xAI \(Grok\)/ }) }).click()
    await dialog.getByRole('button', { name: /^(doorgaan|continue)$/i }).click()
    // Step 2: name and key, with the chosen service on top.
    await expect(dialog.locator('#connection-label')).toHaveValue('xAI (Grok)')
    await expect(dialog.locator('#baseURL')).toHaveCount(0)
    await expect(dialog.getByRole('link', { name: /console\.x\.ai/ })).toHaveAttribute('href', 'https://console.x.ai')
    await dialog.locator('#apiKey').fill('xai-e2e-key')
    // Connecting checks the key by loading the models. The test key is refused, which explains
    // itself and offers to add model IDs by hand. Nothing is saved yet.
    await dialog.getByRole('button', { name: /^(verbinden|connect)$/i }).click()
    await expect(dialog.getByRole('alert')).toContainText(/weigerde|refused|niet bereikbaar|be reached/i)
    expect((await payload.find({ collection: 'assistant-settings', overrideAccess: true, where: { tenant: { equals: site } } })).docs[0]?.connections ?? []).toHaveLength(0)
    await dialog.getByRole('button', { name: /overslaan|skip/i }).click()
    // Step 3: the models.
    await dialog.getByLabel(/model-id met de hand|model id by hand/i).fill('grok-e2e')
    await dialog.getByRole('button', { name: /^(toevoegen|add)$/i }).click()
    await expect(dialog.getByRole('checkbox', { name: 'grok-e2e' })).toBeChecked()
    await dialog.getByRole('button', { name: /^(opslaan|save)$/i }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByText('xAI (Grok)', { exact: true }).last()).toBeVisible()

    const { docs: [settings] } = await payload.find({ collection: 'assistant-settings', overrideAccess: true, where: { tenant: { equals: site } } })
    expect(settings.connections?.[0]).toMatchObject({ provider: 'openai-compatible', baseURL: 'https://api.x.ai/v1', hasKey: true, models: ['grok-e2e'] })
  })

  test('switching a saved connection to another service asks for a new key', async ({ page }) => {
    await login(page, admin)
    await page.goto(`/admin/${site}/settings/ai`)
    await page.getByRole('button', { name: /acties voor|actions for/i }).first().click()
    await page.getByRole('menuitem', { name: /bewerken|edit/i }).click()
    const dialog = page.getByRole('dialog')
    // An existing connection opens on its models; Change goes back to its name and key.
    await expect(dialog.getByRole('checkbox', { name: 'grok-e2e' })).toBeChecked()
    await dialog.getByRole('button', { name: /^(wijzigen|change)$/i }).click()
    await expect(dialog.locator('#apiKey')).not.toHaveAttribute('required')
    await dialog.getByRole('button', { name: /^(wijzigen|change)$/i }).click()
    await dialog.locator('label', { has: page.getByRole('radio', { name: /^DeepSeek/ }) }).click()
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
    // What the providers would report: model-a thinks (low to high) and reads files, model-b doesn't.
    await page.route('**/api/assistant/capabilities**', (route) =>
      route.fulfill({
        json: {
          models: {
            [`${connection.id}:model-a`]: { efforts: ['low', 'medium', 'high'], images: true, pdfs: true },
            [`${connection.id}:model-b`]: { efforts: [], images: false, pdfs: false },
          },
        },
      }),
    )
    await page.setViewportSize({ width: 1280, height: 900 })
    await login(page, admin)
    await page.goto(`/admin/${site}/pages`)
    await expect(page.getByRole('textbox', { name: /vraag ai|ask ai/i })).toBeVisible()
    await page.getByRole('button', { name: /^(model)$/i }).click()
    await page.getByRole('menuitemradio', { name: 'model-b' }).click()
    await expect(page.getByRole('button', { name: /^(model)$/i })).toContainText('model-b')
    // model-b has no effort levels, so its menu is hidden.
    await expect(page.getByRole('button', { name: /^(denkniveau|effort)$/i })).toHaveCount(0)
    await page.getByRole('button', { name: /^(model)$/i }).click()
    await page.getByRole('menuitemradio', { name: 'model-a' }).click()
    // The overview has the large prompt instead of the floating bar.
    await page.goto(`/admin/${site}`)
    await expect(page.getByRole('textbox', { name: /vraag ai|ask ai/i })).toHaveCount(1)
    await expect(page.getByRole('textbox', { name: /vraag ai|ask ai/i })).toHaveJSProperty('tagName', 'TEXTAREA')
    await expect(page.getByRole('button', { name: /seo/i })).toBeVisible()
    // The effort menu lists only model-a's levels and shows just the chosen one.
    await page.getByRole('button', { name: /^(denkniveau|effort)$/i }).click()
    await expect(page.getByRole('menuitemradio')).toHaveText([/standaard|default/i, /laag|low/i, /gemiddeld|medium/i, /hoog|high/i])
    await page.getByRole('menuitemradio', { name: /^(hoog|high)$/i }).click()
    await expect(page.getByRole('button', { name: /^(denkniveau|effort)$/i })).toHaveText(/^(hoog|high)$/i)
    // Sending starts a new chat on the full AI page.
    await page.getByRole('textbox', { name: /vraag ai|ask ai/i }).fill('Hallo vanaf het overzicht')
    await page.keyboard.press('Enter')
    await page.waitForURL(`**/admin/${site}/ai`)
    await expect(page.getByText('Hallo vanaf het overzicht')).toBeVisible()
    // The + button opens a menu of what can be added; the media library opens its picker.
    await page.getByRole('button', { name: /^(toevoegen|add)$/i }).click()
    await expect(page.getByRole('menuitem', { name: /afbeelding of pdf uploaden|upload image or pdf/i })).toBeVisible()
    await page.getByRole('menuitem', { name: /uit mediabibliotheek|from media library/i }).click()
    await expect(page.getByRole('dialog', { name: /uit mediabibliotheek|from media library/i })).toBeVisible()
  })

  test('a connection can be renamed, get a new key and be deleted after confirming', async ({ page }) => {
    await login(page, admin)
    await page.goto(`/admin/${site}/settings/ai`)
    await page.getByRole('button', { name: /acties voor|actions for/i }).first().click()
    await page.getByRole('menuitem', { name: /bewerken|edit/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /^(wijzigen|change)$/i }).click()
    await dialog.locator('#connection-label').fill('Team Grok')
    await dialog.locator('#apiKey').fill('xai-new-key')
    await dialog.getByRole('button', { name: /^(verbinden|connect)$/i }).click()
    await dialog.getByRole('button', { name: /overslaan|skip/i }).click()
    await dialog.getByRole('button', { name: /^(opslaan|save)$/i }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByText('Team Grok', { exact: true })).toBeVisible()

    const before = (await payload.find({ collection: 'assistant-settings', overrideAccess: true, where: { tenant: { equals: site } } })).docs[0]
    const connection = before.connections![0]
    await payload.update({ collection: 'assistant-settings', overrideAccess: true, id: before.id, data: { defaultModel: `${connection.id}:model-a` } })
    await page.reload()

    // Switching off the default model clears the default, so the chat doesn't point at it.
    await page.getByRole('button', { name: /acties voor team grok|actions for team grok/i }).click()
    await page.getByRole('menuitem', { name: /bewerken|edit/i }).click()
    await dialog.getByRole('checkbox', { name: 'model-a' }).click()
    await dialog.getByRole('button', { name: /^(opslaan|save)$/i }).click()
    await expect(dialog).toHaveCount(0)
    const unticked = (await payload.find({ collection: 'assistant-settings', overrideAccess: true, where: { tenant: { equals: site } } })).docs[0]
    expect(unticked.connections![0].models).toEqual(['model-b'])
    expect(unticked.defaultModel ?? null).toBeNull()

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
  const order = names.slice(1, -1) // without the website's name at the top and the account menu
  expect(order[0]).toMatch(/overzicht|overview/i)
  expect(order[1]).toMatch(/^ai$/i)
  expect(order.at(-1)).toMatch(/instellingen|settings/i)
  expect(order.at(-2)).toMatch(/live site bekijken|view live site/i)
  expect(order.some((name) => /^platform$/i.test(name))).toBe(false)
})

test('the account menu switches the theme and the language in place', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await login(page, user)
  await page.goto(`/admin/${site}`)
  const html = page.locator('html')
  await page.getByRole('button').filter({ hasText: user.email }).last().click()
  await page.getByRole('menuitem', { name: /^(weergave|appearance)$/i }).click()
  // The choices apply at once and the menu stays open.
  await page.getByRole('menuitemradio', { name: /^(donker|dark)$/i }).click()
  await expect(html).toHaveClass(/dark/)
  await page.getByRole('menuitemradio', { name: /^english$/i }).click()
  await expect(html).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/what would you like to change/i)
  await page.getByRole('menuitemradio', { name: /^(nederlands|dutch)$/i }).click()
  await expect(html).toHaveAttribute('lang', 'nl')
})

test('appearance choices apply at once and survive a reload', async ({ page }) => {
  await login(page, user)
  // The old address of this page redirects to Weergave.
  await page.goto('/admin/account/preferences')
  await page.waitForURL('**/admin/account/appearance')
  const html = page.locator('html')
  // Choice cards: the radio is only visually hidden, so pick the card.
  const pick = (name: RegExp) => page.locator('label', { has: page.getByRole('radio', { name }) }).click()
  await pick(/^(donker|dark)$/i)
  await expect(html).toHaveClass(/dark/)
  await pick(/^(blauw|blue)$/i)
  await expect(html).toHaveAttribute('data-accent', 'blue')
  await expect(page.getByRole('radio', { name: /^(blauw|blue)$/i })).toBeChecked()
  await pick(/^inter/i)
  await expect(html).toHaveAttribute('data-font', 'inter')
  await pick(/^(rond|round)$/i)
  await expect(html).toHaveAttribute('data-radius', 'round')
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
  await expect(html).toHaveAttribute('data-radius', 'round')
  await expect(html).toHaveAttribute('data-reduce-motion', 'true')
  await expect(html).toHaveClass(/dark/)
  expect(await html.evaluate((element) => getComputedStyle(element).fontFamily)).toMatch(/inter/i)
})

test('the sign-in screen asks for the email, then the password, and switches language', async ({ page }) => {
  await page.context().clearCookies()
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/admin/login')
  await expect(page.getByRole('img', { name: 'Optidigi CMS' })).toBeVisible()
  await page.getByRole('button', { name: /cms-taal|cms language/i }).click()
  await page.getByRole('menuitemradio', { name: 'English' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/welcome back/i)
  // The choice is kept in the language cookie for signed-out visitors.
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/welcome back/i)
  // Step two shows the address with a way back; the address is kept.
  await page.locator('#email').fill('someone@example.test')
  await page.getByRole('button', { name: /^continue$/i }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/enter your password/i)
  await expect(page.getByText('someone@example.test')).toBeVisible()
  await expect(page.locator('#password')).toBeFocused()
  await page.getByRole('button', { name: /another email/i }).click()
  await expect(page.locator('#email')).toHaveValue('someone@example.test')
  await page.context().clearCookies()
})
