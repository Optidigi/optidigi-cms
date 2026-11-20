import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

test('native Payload keeps assistant context when expanding the drawer and protects model settings', async ({
  baseURL,
  context,
  page,
}) => {
  test.setTimeout(60_000)
  const payload = await getPayload({ config })
  const slug = 'native-admin-' + randomUUID()
  const email = slug + '@example.test'
  const editor = slug + '-editor@example.test'
  const platform = slug + '-platform@example.test'
  const password = randomUUID()
  const tenant = await payload.create({
    collection: 'tenants',
    overrideAccess: true,
    data: { slug, name: 'Native admin fixture', siteOrigin: 'https://example.com' },
  })

  try {
    for (const [account, role] of [
      [email, 'admin'],
      [editor, 'editor'],
    ] as const) {
      await payload.create({
        collection: 'users',
        overrideAccess: true,
        context: { bootstrapUser: true },
        data: {
          email: account,
          password,
          role: 'customer',
          tenants: [{ tenant: tenant.id, role }],
        },
      })
    }
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
    await page.route('**/api/assistant', (route) => {
      const input = route.request().postDataJSON()
      expect(input.tenant).toBe(tenant.id)
      if (input.action === 'status')
        return route.fulfill({
          json: {
            connected: true,
            model: 'fixture-model',
            settings: { provider: 'openai', model: 'fixture-model' },
          },
        })
      expect(input.locale).toBe('en')
      expect(input.context).toEqual({ collection: 'pages', id: home.id })
      return route.fulfill({
        contentType: 'text/event-stream',
        body: 'data: ' + JSON.stringify({ type: 'text', text: 'Draft **reply**' }) + '\n\n',
      })
    })

    const documentRoute = '/admin/collections/pages/' + home.id + '?locale=en'
    expect((await page.goto(documentRoute, { waitUntil: 'domcontentloaded' }))?.status()).toBe(200)
    for (const collection of ['pages', 'articles', 'projects', 'media', 'site-settings']) {
      await expect(
        page.locator('nav a[href="/admin/collections/' + collection + '"]'),
      ).toBeVisible()
    }
    await expect(page.locator('nav a[href="/admin/collections/tenants"]')).toHaveCount(0)
    await expect(page.locator('nav a[href="/admin/collections/users"]')).toHaveCount(0)
    await expect(page.locator('a[href="/admin/account"]')).toHaveCount(1)

    await page.getByRole('button', { name: 'Vraag AI' }).click()
    const drawer = page.getByRole('dialog', { name: 'AI-assistent' })
    await drawer.getByRole('textbox', { name: 'Bericht' }).fill('Werk deze pagina bij')
    await drawer.getByRole('button', { name: 'Versturen' }).click()
    await expect(drawer.getByRole('log').getByText('Draft reply')).toBeVisible()
    await drawer.getByRole('link', { name: 'Open assistentpagina' }).click()
    await expect(page).toHaveURL(
      '/admin/assistant?collection=pages&document=' + home.id + '&locale=en',
    )
    await expect(page.getByRole('log').getByText('Draft reply')).toBeVisible()

    const followup = page.waitForRequest(
      (request) =>
        request.url().endsWith('/api/assistant') && request.postDataJSON()?.action === 'chat',
    )
    await page.getByRole('textbox', { name: 'Bericht' }).fill('Werk verder')
    await page.getByRole('button', { name: 'Versturen' }).click()
    expect((await followup).postDataJSON()).toMatchObject({
      locale: 'en',
      context: { collection: 'pages', id: home.id },
      messages: [
        { role: 'user', content: 'Werk deze pagina bij' },
        { role: 'assistant', content: 'Draft **reply**' },
        { role: 'user', content: 'Werk verder' },
      ],
    })

    await page.goto('/admin/assistant?settings=model', { waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel('API-sleutel')).toBeVisible()
    await expect(await login(editor)).toBeOK()
    await page.goto('/admin/assistant?settings=model', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('log')).toBeVisible()
    await expect(page.getByLabel('API-sleutel')).toHaveCount(0)
    await expect(page.getByText('Draft reply')).toHaveCount(0)

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
      where: { email: { in: [email, editor, platform] } },
      overrideAccess: true,
    })
    await payload.delete({ collection: 'tenants', id: tenant.id, overrideAccess: true })
    await payload.destroy()
  }
})
