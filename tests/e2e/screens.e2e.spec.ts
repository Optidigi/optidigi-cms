import AxeBuilder from '@axe-core/playwright'
import { randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { expect, test } from '../helpers/test'

// The screens the other journeys don't reach: website settings, media upload, platform users and
// password reset, plus an automatic accessibility check of the main screens.
const suffix = randomUUID().slice(0, 8)
const admin = { email: `e2e-screens-${suffix}@example.test`, password: randomUUID() }
const created = { email: `e2e-new-${suffix}@example.test`, password: randomUUID() }
let payload: Payload
let site: number
let home: number

// A 1×1 PNG.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

test.beforeAll(async () => {
  payload = await getPayload({ config })
  site = (await payload.create({
    collection: 'tenants', overrideAccess: true,
    data: { name: `E2E Screens ${suffix}`, slug: `e2e-screens-${suffix}`, siteOrigin: 'https://example.com' },
  })).id
  await payload.create({
    collection: 'users', overrideAccess: true, context: { bootstrapUser: true },
    data: { ...admin, role: 'platform-admin', tenants: [{ tenant: site, role: 'admin' }] },
  })
  home = (await payload.create({
    collection: 'pages', locale: 'nl', overrideAccess: true,
    data: { tenant: site, slug: 'home', title: 'Home', heading: 'Welkom', _status: 'published' },
  })).id
})

test.afterAll(async () => {
  for (const collection of ['pages', 'media', 'site-settings'] as const) {
    await payload.delete({ collection, overrideAccess: true, where: { tenant: { equals: site } } })
  }
  await payload.delete({ collection: 'users', overrideAccess: true, where: { email: { in: [admin.email, created.email] } } })
  await payload.delete({ collection: 'tenants', overrideAccess: true, id: site })
})

test('website settings are published from the general settings', async ({ page }) => {
  await login(page, admin)
  await page.goto(`/admin/${site}/settings/general`)
  await page.locator('#name').fill(`Bakkerij ${suffix}`)
  await page.locator('#contactEmail').fill('info@example.com')
  await page.getByRole('button', { name: /^(publiceren|publish)$/i }).click()
  await expect(page.getByText(/^(gepubliceerd|published)\.$/i)).toBeVisible()
  const { docs: [settings] } = await payload.find({ collection: 'site-settings', overrideAccess: true, where: { tenant: { equals: site } } })
  expect(settings).toMatchObject({ name: `Bakkerij ${suffix}`, contactEmail: 'info@example.com', _status: 'published' })
})

test('images are uploaded on the media page', async ({ page }) => {
  await login(page, admin)
  await page.goto(`/admin/${site}/media`)
  await page.locator('input[type="file"]').setInputFiles({ name: `dot-${suffix}.png`, mimeType: 'image/png', buffer: png })
  await expect(page.getByText(/^(geüpload|uploaded)\.$/i)).toBeVisible()
  await expect.poll(async () => (await payload.find({ collection: 'media', overrideAccess: true, where: { tenant: { equals: site } } })).totalDocs).toBe(1)
})

test('platform administrators add a user with a role on a website', async ({ page }) => {
  await login(page, admin)
  await page.goto('/admin/platform/users/new')
  await page.locator('#email').fill(created.email)
  await page.locator('#password').fill(created.password)
  await page.getByRole('combobox', { name: new RegExp(`E2E Screens ${suffix}`) }).click()
  await page.getByRole('option', { name: /^(redacteur|editor)$/i }).click()
  await page.getByRole('button', { name: /^(opslaan|save)$/i }).click()
  await expect.poll(async () => (await payload.find({ collection: 'users', depth: 0, overrideAccess: true, where: { email: { equals: created.email } } })).docs[0]?.tenants)
    .toEqual([expect.objectContaining({ tenant: site, role: 'editor' })])
})

test('platform administrators edit a website and see field errors from Payload', async ({ page }) => {
  await login(page, admin)
  await page.goto(`/admin/platform/websites/${site}`)
  // Payload refuses an address that isn't an HTTPS origin; the form marks the field.
  await page.locator('#siteOrigin').fill('http://example.com/path')
  await page.getByRole('button', { name: /^(opslaan|save)$/i }).click()
  await expect(page.locator('#siteOrigin')).toHaveAttribute('aria-invalid', 'true')
  await page.locator('#siteOrigin').fill('https://example.org')
  await page.getByRole('button', { name: /^(opslaan|save)$/i }).click()
  await expect(page.getByText(/^(opgeslagen|saved)\.$/i)).toBeVisible()
  await expect(page.locator('#siteOrigin')).not.toHaveAttribute('aria-invalid')
  expect((await payload.findByID({ collection: 'tenants', id: site, overrideAccess: true, depth: 0 })).siteOrigin).toBe('https://example.org')
})

test('the profile page changes the signed-in user\'s password', async ({ page }) => {
  await login(page, admin)
  await page.goto('/admin/account/profile')
  admin.password = randomUUID()
  await page.locator('#password').fill(admin.password)
  await page.getByRole('button', { name: /^(opslaan|save)$/i }).click()
  await expect(page.getByText(/^(opgeslagen|saved)\.$/i)).toBeVisible()
  await expect(page.locator('#password')).toHaveValue('')
  await page.context().clearCookies()
  await login(page, admin)
})

test('a forgotten password is replaced through the emailed link', async ({ page }) => {
  await page.goto('/admin/forgot')
  await page.locator('#email').fill(admin.email)
  await page.getByRole('button', { name: /herstellink versturen|send reset link/i }).click()
  await expect(page.locator('[data-slot=alert]')).toContainText(/herstellink|reset link/i)
  // The link from the email: Payload's reset token for this user.
  const { docs: [account] } = await payload.find({
    collection: 'users', depth: 0, overrideAccess: true, showHiddenFields: true, where: { email: { equals: admin.email } },
  })
  expect(account.resetPasswordToken).toBeTruthy()
  admin.password = randomUUID()
  await page.goto(`/admin/reset/${account.resetPasswordToken}`)
  await page.locator('#password').fill(admin.password)
  await page.getByRole('button', { name: /wachtwoord opslaan|save password/i }).click()
  await expect(page.locator('[data-slot=alert]')).toContainText(/opgeslagen|saved/i)
  await page.context().clearCookies()
  await login(page, admin)
})

// The main screens in light and dark mode (the theme follows the system by default).
for (const colorScheme of ['light', 'dark'] as const) {
  test(`the main screens pass an automatic accessibility check in ${colorScheme} mode`, async ({ page, browser }) => {
    const check = async (target: import('@playwright/test').Page, path: string) => {
      await target.goto(path)
      await target.waitForLoadState('networkidle')
      const { violations } = await new AxeBuilder({ page: target }).withTags(['wcag2a', 'wcag2aa']).analyze()
      // One line per element: the rule, what axe says and the element's opening tag.
      return violations.flatMap(({ id, nodes }) =>
        nodes.map(({ html, failureSummary }) => `${path} ${id}: ${failureSummary?.split('\n').at(-1)?.trim()} — ${html.slice(0, 160)}`),
      )
    }
    const found: string[] = []
    const signedOut = await (await browser.newContext({ colorScheme })).newPage()
    for (const path of ['/admin/login', '/admin/forgot']) found.push(...(await check(signedOut, path)))
    await signedOut.context().close()
    await page.emulateMedia({ colorScheme })
    await login(page, admin)
    for (const path of [
      `/admin/${site}`,
      `/admin/${site}/pages`,
      `/admin/${site}/pages/${home}`,
      `/admin/${site}/media`,
      `/admin/${site}/ai`,
      `/admin/${site}/settings/general`,
      `/admin/${site}/settings/ai`,
      '/admin/platform/websites',
      '/admin/platform/users',
      '/admin/account/appearance',
    ]) {
      found.push(...(await check(page, path)))
    }
    expect(found).toEqual([])
  })
}
