import { randomUUID } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { startMockModel } from '../helpers/mock-model'
import { expect, test } from '../helpers/test'

// The assistant end to end against a local test model: streaming, a read-only tool that runs by
// itself, and a change that waits for the editor's approval.
test.use({ stubAI: false })
test.describe.configure({ mode: 'serial' })

const suffix = randomUUID().slice(0, 8)
const user = { email: `e2e-ai-${suffix}@example.test`, password: randomUUID() }
let payload: Payload
let site: number
let home: number
let model: Awaited<ReturnType<typeof startMockModel>>

test.beforeAll(async () => {
  payload = await getPayload({ config })
  model = await startMockModel()
  site = (await payload.create({
    collection: 'tenants', overrideAccess: true,
    data: { name: `E2E AI ${suffix}`, slug: `e2e-ai-${suffix}`, siteOrigin: 'https://example.com' },
  })).id
  await payload.create({
    collection: 'users', overrideAccess: true, context: { bootstrapUser: true },
    data: { ...user, role: 'customer', tenants: [{ tenant: site, role: 'admin' }] },
  })
  home = (await payload.create({
    collection: 'pages', locale: 'nl', overrideAccess: true,
    data: { tenant: site, slug: 'home', title: 'Home', heading: 'Welkom', _status: 'published' },
  })).id
  const settings = await payload.create({
    collection: 'assistant-settings', overrideAccess: true,
    data: { tenant: site, connections: [{ label: 'Test model', provider: 'openai-compatible', baseURL: 'https://placeholder.invalid/v1', apiKey: 'test-key', models: ['mock-a'] }] },
  })
  // Connections must use https; the local test model is plain http, so point the row at it directly.
  await payload.db.drizzle.execute(
    sql`update assistant_settings_connections set base_u_r_l = ${model.baseURL} where _parent_id = ${settings.id}`,
  )
})

test.afterAll(async () => {
  await payload.delete({ collection: 'assistant-threads', overrideAccess: true, where: { tenant: { equals: site } } })
  await payload.delete({ collection: 'assistant-settings', overrideAccess: true, where: { tenant: { equals: site } } })
  await payload.delete({ collection: 'pages', overrideAccess: true, where: { tenant: { equals: site } } })
  await payload.delete({ collection: 'users', overrideAccess: true, where: { email: { equals: user.email } } })
  await payload.delete({ collection: 'tenants', overrideAccess: true, id: site })
  await model?.close()
})

// Types a message and sends it once the chat is ready for it.
async function ask(page: import('@playwright/test').Page, message: string) {
  await page.getByRole('textbox', { name: /vraag ai|ask ai/i }).fill(message)
  const send = page.getByRole('button', { name: /^(versturen|send)$/i })
  await expect(send).toBeEnabled()
  await send.click()
}

test('the assistant streams an answer and keeps the chat', async ({ page }) => {
  await login(page, user)
  await page.goto(`/admin/${site}/ai`)
  await ask(page, 'Hello there')
  await expect(page.getByText('Hello! I am the test model.')).toBeVisible()
  // The chat is stored: after a reload it is in the history and opens again.
  await page.reload()
  await page.getByRole('complementary').getByText('Hello there').click()
  await expect(page.getByText('Hello! I am the test model.')).toBeVisible()
})

test('a read-only tool runs by itself', async ({ page }) => {
  await login(page, user)
  await page.goto(`/admin/${site}/ai`)
  await ask(page, 'Please list pages')
  // It found this website's one page (and nothing of other websites).
  await expect(page.getByText(/^Done: /)).toContainText('Total: 1 documents')
})

test('a change waits for the editor to allow it', async ({ page }) => {
  await login(page, user)
  await page.goto(`/admin/${site}/ai`)
  await ask(page, `Please rename page ${home}`)
  const allow = page.getByRole('button', { name: /^(toestaan|allow)$/i })
  await expect(allow).toBeVisible()
  // Nothing changed yet.
  const draft = () => payload.findByID({ collection: 'pages', id: home, draft: true, locale: 'nl', overrideAccess: true, depth: 0 })
  expect((await draft()).heading).toBe('Welkom')
  await allow.click()
  await expect(page.getByText(/^Done: /)).toBeVisible()
  await expect.poll(async () => (await draft()).heading).toBe('Changed by AI')
  // Saved as a draft: the published page is unchanged.
  expect((await payload.findByID({ collection: 'pages', id: home, locale: 'nl', overrideAccess: true, depth: 0 })).heading).toBe('Welkom')
})
