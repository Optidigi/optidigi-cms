import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

test('compares the native admin and shadcn editor using one Payload session', async ({
  baseURL,
  context,
  page,
}) => {
  test.setTimeout(150_000)
  const payload = await getPayload({ config, key: randomUUID() })
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
    await payload.update({
      collection: 'pages',
      id: home.id,
      locale: 'en',
      overrideAccess: true,
      publishAllLocales: false,
      data: { title: 'English homepage', heading: 'English heading', _status: 'published' },
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

    await context.clearCookies()
    await page.goto('/admin-shadcn')
    await expect(page).toHaveURL('/admin-shadcn/login')
    await expect(page.getByRole('heading', { name: 'Inloggen' })).toBeVisible()
    await page.getByRole('button', { name: 'Weergave' }).click()
    await page.getByRole('menuitemradio', { name: 'Donker' }).press('Enter')
    await expect(page.locator('html')).toHaveClass(/(?:^| )dark(?: |$)/)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/(?:^| )dark(?: |$)/)
    await page.getByLabel('E-mailadres').fill(email)
    await page.getByLabel('Wachtwoord', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Inloggen', exact: true }).click()
    const root = '/admin-shadcn/' + tenant.id
    await expect(page).toHaveURL(new RegExp(root + '(/.*)?$'))
    await expect(page.locator('html')).toHaveClass(/(?:^| )dark(?: |$)/)
    for (const collection of ['Pagina’s', 'Artikelen', 'Portfolio', 'Media', 'Instellingen']) {
      await expect(page.getByRole('link', { name: collection, exact: true }).first()).toBeVisible()
    }
    expect((await page.goto('/admin-shadcn/' + other.id + '/pages'))?.status()).toBe(404)
    expect((await page.goto('/admin-shadcn/platform'))?.status()).toBe(404)
    await context.addCookies([
      {
        name: 'optidigi-content-language',
        value: 'en',
        domain: new URL(baseURL!).hostname,
        path: '/admin-shadcn',
      },
    ])
    const document = root + '/pages?id=' + home.id
    expect((await page.goto(document))?.status()).toBe(200)
    await expect(page.getByRole('textbox', { name: 'Paginakop' })).toHaveValue('Live')
    await page.getByRole('textbox', { name: 'Paginakop' }).fill('Unsaved draft')
    await page.getByRole('button', { name: 'Taal', exact: true }).press('Enter')
    await page.getByRole('menuitemradio', { name: 'English', exact: true }).press('Enter')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page).toHaveURL(document)
    await expect(page.getByRole('textbox', { name: 'Page heading' })).toHaveValue('Unsaved draft')
    await expect(page.getByRole('button', { name: 'Content language', exact: true })).toHaveCount(0)

    const native = await context.newPage()
    await native.goto('/admin', { waitUntil: 'domcontentloaded' })
    await expect(native.locator('html')).toHaveAttribute('lang', 'en')
    await native.close()

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByRole('button', { name: 'Language', exact: true })).toBeVisible()
    expect(
      await page.evaluate(() => window.document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390)
    await page.setViewportSize({ width: 1280, height: 720 })

    page.once('dialog', (dialog) => dialog.accept())
    await page.goto(root + '/settings/assistant', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Model connection', exact: true })).toBeVisible()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await page.goto(document + '&locale=en', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('textbox', { name: 'Page heading' })).toHaveValue('English heading')
    await page.getByRole('button', { name: 'Language', exact: true }).press('Enter')
    await page.getByRole('menuitemradio', { name: 'Nederlands', exact: true }).press('Enter')
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl')
    await expect(page).toHaveURL(document + '&locale=en')
    await expect(page.getByRole('textbox', { name: 'Paginakop' })).toHaveValue('English heading')
    await page.goto(document, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('textbox', { name: 'Paginakop' })).toHaveValue('Live')
    await page.getByRole('textbox', { name: 'Paginakop' }).fill('Draft from shadcn')
    await page.getByLabel('Inhoud', { exact: true }).fill('Rich text from shadcn')
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
    const publishedPage = await payload.findByID({
      collection: 'pages',
      id: home.id,
      locale: 'nl',
      overrideAccess: true,
      depth: 0,
    })
    expect(JSON.stringify(publishedPage.body)).toContain('Rich text from shadcn')
    await page.goto('/admin-shadcn/account')
    await expect(page.getByLabel('E-mailadres')).toHaveValue(email)
    const updatedPassword = randomUUID()
    await page.getByLabel('Huidig wachtwoord', { exact: true }).fill(password)
    await page.getByLabel('Nieuw wachtwoord', { exact: true }).fill(updatedPassword)
    await page.getByRole('button', { name: 'Wijzigingen opslaan' }).click()
    await expect(page).toHaveURL('/admin-shadcn/login?updated=1')
    await page.getByLabel('E-mailadres').fill(email)
    await page.getByLabel('Wachtwoord', { exact: true }).fill(updatedPassword)
    await page.getByRole('button', { name: 'Inloggen', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(root + '(/.*)?$'))

    const requestHeaders = { Origin: new URL(baseURL!).origin, 'Content-Type': 'application/json' }
    const assistant = (data: object) =>
      context.request.post('/api/assistant', {
        headers: requestHeaders,
        data: { ...data, tenant: tenant.id },
      })
    await expect(
      await assistant({
        action: 'connect',
        provider: 'openai',
        model: 'gpt-6-luna',
        apiKey: 'synthetic-fixture-key',
      }),
    ).toBeOK()
    await page.route('**/api/assistant', async (route) => {
      const input = route.request().postDataJSON()
      if (input?.action !== 'chat-v2') return route.continue()
      expect(input.tenant).toBe(tenant.id)
      expect(input.detail).toBe('detailed')
      expect(input.effort).toBe('low')
      expect(input.context).toEqual({ collection: 'pages', id: home.id })
      const [user] = input.messages
      expect(user.parts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'text', text: 'Werk deze pagina bij' }),
          expect.objectContaining({ type: 'file', filename: 'brief.txt', mediaType: 'text/plain' }),
        ]),
      )
      const reply = {
        id: randomUUID(),
        role: 'assistant',
        parts: [{ type: 'text', text: 'Draft reply' }],
      }
      for (const message of [user, reply]) {
        await payload.create({
          collection: 'assistant-messages',
          overrideAccess: true,
          data: { thread: input.thread, messageId: message.id, message },
        })
      }
      const chunks = [
        { type: 'start', messageId: reply.id },
        { type: 'text-start', id: 'reply' },
        { type: 'text-delta', id: 'reply', delta: 'Draft reply' },
        { type: 'text-end', id: 'reply' },
        { type: 'finish', finishReason: 'stop' },
      ]
      return route.fulfill({
        headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
        body:
          chunks.map((chunk) => 'data: ' + JSON.stringify(chunk) + '\n\n').join('') +
          'data: [DONE]\n\n',
      })
    })
    await page.goto(root + '/settings/assistant')
    await expect(page.getByRole('heading', { name: 'Modelverbinding', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Verbinding wijzigen' }).click()
    await expect(page.getByLabel('Model-ID')).toHaveValue('gpt-6-luna')
    await expect(page.getByLabel('API-sleutel')).toHaveValue('')
    await page.goto(root + '/pages?id=' + home.id)
    await page.getByRole('button', { name: 'Vraag AI' }).click()
    const drawer = page.getByRole('dialog')
    await drawer.getByRole('button', { name: 'gpt-6-luna' }).click()
    await expect(page.getByRole('menuitem', { name: 'Modelverbinding beheren' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menuitem', { name: 'Modelverbinding beheren' })).toBeHidden()
    await drawer.getByRole('button', { name: /Antwoordlengte/ }).press('Enter')
    await page.getByRole('menuitemradio', { name: 'Uitgebreid' }).press('Enter')
    await expect(drawer.getByRole('button', { name: 'Antwoordlengte: Uitgebreid' })).toBeVisible()
    await drawer.getByRole('button', { name: /Redeneerinspanning/ }).press('Enter')
    await page.getByRole('menuitemradio', { name: 'Laag' }).press('Enter')
    await expect(drawer.getByRole('button', { name: 'Redeneerinspanning: Laag' })).toBeVisible()
    await drawer.getByLabel('Bestanden', { exact: true }).setInputFiles({
      name: 'brief.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Private fixture'),
    })
    await expect(drawer.getByText('brief.txt', { exact: true })).toBeVisible()
    await drawer.getByRole('textbox', { name: 'Bericht' }).fill('Werk deze pagina bij')
    await drawer.getByRole('button', { name: 'Versturen' }).click()
    await expect(drawer.getByText('Draft reply')).toBeVisible()
    const settings = await (await assistant({ action: 'thread-list' })).json()
    const thread = settings.threads[0].id
    await drawer.getByLabel('Open assistentpagina').click()
    await expect(page).toHaveURL(
      root + '/assistant?document=' + home.id + '&locale=nl&thread=' + thread,
    )
    await expect(page.getByRole('heading', { name: 'AI-assistent' })).toBeVisible()
    await expect(page.getByText('Draft reply')).toBeVisible()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Draft reply')).toBeVisible()
    await expect(
      await assistant({ action: 'thread-update', thread, title: 'Conceptbrief' }),
    ).toBeOK()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Conceptbrief', exact: true })).toBeVisible()
    await expect(await assistant({ action: 'thread-delete', thread })).toBeOK()
    expect((await assistant({ action: 'thread-read', thread })).status()).toBe(404)
  } finally {
    const { docs: threads } = await payload.find({
      collection: 'assistant-threads',
      where: { tenant: { equals: tenant.id } },
      overrideAccess: true,
      pagination: false,
      depth: 0,
    })
    for (const { id } of threads) {
      await payload.delete({
        collection: 'assistant-uploads',
        where: { thread: { equals: id } },
        overrideAccess: true,
      })
      await payload.delete({
        collection: 'assistant-messages',
        where: { thread: { equals: id } },
        overrideAccess: true,
      })
      await payload.delete({ collection: 'assistant-threads', id, overrideAccess: true })
    }
    await payload.delete({
      collection: 'assistant-credentials',
      where: { tenant: { equals: tenant.id } },
      overrideAccess: true,
    })
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
