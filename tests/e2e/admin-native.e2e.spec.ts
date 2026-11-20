import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

test('stock Payload keeps native editors and role-scoped navigation', async ({
  baseURL,
  context,
  page,
}) => {
  test.setTimeout(60_000)
  const payload = await getPayload({ config, key: randomUUID() })
  const slug = 'native-admin-' + randomUUID()
  const email = slug + '@example.test'
  const platform = slug + '-platform@example.test'
  const password = randomUUID()
  const tenant = await payload.create({
    collection: 'tenants',
    overrideAccess: true,
    data: { slug, name: 'Native admin fixture', siteOrigin: 'https://example.com' },
  })

  try {
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { bootstrapUser: true },
      data: { email, password, role: 'customer', tenants: [{ tenant: tenant.id, role: 'editor' }] },
    })
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { bootstrapUser: true },
      data: { email: platform, password, role: 'platform-admin' },
    })
    const home = await payload.create({
      collection: 'pages',
      locale: 'en',
      overrideAccess: true,
      data: { tenant: tenant.id, slug: 'home', title: 'Homepage', _status: 'published' },
    })
    const login = (account: string) =>
      context.request.post('/api/users/login', {
        headers: { Origin: new URL(baseURL!).origin },
        data: { email: account, password },
      })
    await expect(await login(email)).toBeOK()
    await page.route('https://example.com/**', (route) => route.fulfill({ body: '' }))
    const documentRoute = '/admin/collections/pages/' + home.id + '?locale=en'
    expect((await page.goto(documentRoute, { waitUntil: 'domcontentloaded' }))?.status()).toBe(200)
    const appearance = await page.locator('html').getAttribute('lang')
    const nativeLanguage = page.getByRole('button', {
      name: /Switch to Dutch|Schakel naar Engels/,
    })
    await expect(nativeLanguage).toBeVisible()
    await nativeLanguage.click()
    await expect(page.locator('html')).toHaveAttribute('lang', appearance === 'en' ? 'nl' : 'en')
    await expect(page).toHaveURL(documentRoute)
    await expect(
      page.getByRole('button', { name: /^(Document translation|Documentvertaling):/ }),
    ).toBeVisible()
    await nativeLanguage.click()
    await expect(page.locator('html')).toHaveAttribute('lang', appearance!)

    for (const collection of ['pages', 'articles', 'projects', 'media', 'site-settings']) {
      await expect(page.locator('#nav-' + collection)).toBeVisible()
    }
    await expect(page.locator('nav a[href="/admin/collections/tenants"]')).toHaveCount(0)
    await expect(page.locator('nav a[href="/admin/collections/users"]')).toHaveCount(0)
    await expect(page.locator('a[href="/admin/account"]')).toHaveCount(1)

    await expect(page.locator('input[name="title"]')).toHaveValue('Homepage')
    await expect(page.locator('nav a[href^="/admin-shadcn"]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Vraag AI' })).toHaveCount(0)
    for (const route of ['/admin/assistant', '/admin/settings']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(
        page.getByRole('heading', { name: /^(Niets gevonden|Nothing found)$/ }),
      ).toBeVisible()
    }

    await expect(await login(platform)).toBeOK()
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('nav a[href="/admin/collections/tenants"]')).toBeVisible()
    await expect(page.locator('nav a[href="/admin/collections/users"]')).toBeVisible()
    await expect(page.locator('a[href="/admin/account"]')).toHaveCount(1)
  } finally {
    await payload.delete({
      collection: 'pages',
      where: { tenant: { equals: tenant.id } },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'users',
      where: { email: { in: [email, platform] } },
      overrideAccess: true,
    })
    await payload.delete({ collection: 'tenants', id: tenant.id, overrideAccess: true })
    await payload.destroy()
  }
})
