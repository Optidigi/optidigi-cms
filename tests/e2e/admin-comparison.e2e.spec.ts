import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

test('compares the native admin and shadcn editor using one Payload session', async ({
  baseURL,
  context,
  page,
}) => {
  test.setTimeout(90_000)
  const payload = await getPayload({ config })
  const slug = 'compare-' + randomUUID()
  const email = slug + '@example.test'
  const password = randomUUID()
  const tenant = await payload.create({
    collection: 'tenants',
    overrideAccess: true,
    data: { slug, name: 'Comparison fixture', siteOrigin: 'https://example.com' },
  })

  const other = await payload.create({
    collection: 'tenants',
    overrideAccess: true,
    data: { slug: slug + '-other', name: 'Other fixture', siteOrigin: 'https://example.com' },
  })
  try {
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { bootstrapUser: true },
      data: { email, password, role: 'customer', tenants: [{ tenant: tenant.id, role: 'admin' }] },
    })
    const home = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      locale: 'nl',
      data: {
        tenant: tenant.id,
        slug: 'home',
        title: 'Homepage',
        heading: 'Live',
        _status: 'published',
      },
    })
    await context.route('https://example.com/**', (route) => route.fulfill({ body: '' }))
    const login = await context.request.post('/api/users/login', {
      headers: { Origin: new URL(baseURL!).origin },
      data: { email, password },
    })
    expect(login.ok()).toBe(true)
    await page.goto('/admin-tweaked')
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.locator('html')).toHaveAttribute('data-admin-appearance', 'tweaked')
    const stock = await context.newPage()
    await stock.goto('/admin')
    await expect(stock.locator('html')).not.toHaveAttribute('data-admin-appearance', 'tweaked')
    await stock.close()

    await page.getByRole('button', { name: 'Vraag AI' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Vraag AI' })).toBeFocused()

    expect((await page.goto('/admin-shadcn/' + other.id + '/pages'))?.status()).toBe(404)
    const root = '/admin-shadcn/' + tenant.id
    await page.goto(root + '/pages?id=' + home.id)
    await page.getByRole('textbox', { name: 'Paginakop' }).fill('Draft from shadcn')
    await page.getByRole('button', { name: 'Concept opslaan' }).click()
    await expect(page.getByText('Concept opgeslagen.', { exact: true })).toBeVisible()
    const feed = '/api/site-content?tenant=' + slug + '&locale=nl'
    expect(await (await context.request.get(feed)).json()).toMatchObject({
      homepage: { heading: 'Live' },
    })
    await page.getByRole('button', { name: 'Publiceren', exact: true }).click()
    await expect(page.getByText('Gepubliceerd.', { exact: true })).toBeVisible()
    expect(await (await context.request.get(feed)).json()).toMatchObject({
      homepage: { heading: 'Draft from shadcn' },
    })

    await page.route('**/api/assistant', async (route) => {
      const input = route.request().postDataJSON()
      expect(input.tenant).toBe(tenant.id)
      if (input.action === 'status') {
        return route.fulfill({ json: { connected: true, model: 'fixture-model' } })
      }
      expect(input.context).toEqual({ collection: 'pages', id: home.id })
      return route.fulfill({
        contentType: 'text/event-stream',
        body: 'data: ' + JSON.stringify({ type: 'text', text: 'Draft reply' }) + '\n\n',
      })
    })
    await page.reload()
    await page.getByRole('button', { name: 'Vraag AI' }).click()
    const drawer = page.getByRole('dialog')
    await drawer.getByRole('textbox', { name: 'Bericht' }).fill('Werk deze pagina bij')
    await drawer.getByRole('button', { name: 'Versturen' }).click()
    await expect(drawer.getByText('Draft reply')).toBeVisible()
    await drawer.getByLabel('Open assistentpagina').click()
    await expect(page).toHaveURL(root + '/assistant?document=' + home.id + '&locale=nl')
    await expect(page.getByRole('heading', { name: 'AI-assistent' })).toBeVisible()
    await expect(page.getByText('Draft reply')).toBeVisible()
    const followup = page.waitForRequest(
      (request) =>
        request.url().endsWith('/api/assistant') && request.postDataJSON()?.action === 'chat',
    )
    await page.getByRole('textbox', { name: 'Bericht' }).fill('Werk deze pagina verder bij')
    await page.getByRole('button', { name: 'Versturen' }).click()
    expect((await followup).postDataJSON().context).toEqual({ collection: 'pages', id: home.id })
  } finally {
    await payload.delete({
      collection: 'pages',
      where: { tenant: { equals: tenant.id } },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'users',
      where: { email: { equals: email } },
      overrideAccess: true,
    })
    await payload.delete({ collection: 'tenants', id: tenant.id, overrideAccess: true })
    await payload.delete({ collection: 'tenants', id: other.id, overrideAccess: true })
    await payload.destroy()
  }
})
