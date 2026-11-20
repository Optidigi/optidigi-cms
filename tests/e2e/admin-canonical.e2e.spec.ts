import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

test('editor publishes localized content and uses the shared assistant in the canonical admin', async ({
  baseURL,
  context,
  page,
}) => {
  test.setTimeout(150_000)
  page.setDefaultTimeout(15_000)
  page.setDefaultNavigationTimeout(25_000)
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
    await payload.create({
      collection: 'site-settings',
      overrideAccess: true,
      data: { tenant: tenant.id, name: 'Website fixture', _status: 'published' },
    })
    await context.route('https://example.com/**', (route) => route.fulfill({ body: '' }))
    for (const retired of ['/admin-tweaked', '/admin-shadcn']) {
      expect((await page.goto(retired))?.status()).toBe(404)
    }
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin/login')
    await expect(page.getByRole('heading', { name: 'Inloggen' })).toBeVisible()
    await page.getByRole('button', { name: 'Weergave' }).click()
    await page.getByRole('menuitemradio', { name: 'Donker' }).press('Enter')
    await expect(page.locator('html')).toHaveClass(/(?:^| )dark(?: |$)/)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/(?:^| )dark(?: |$)/)
    await page.getByLabel('E-mailadres').fill(email)
    await page.getByLabel('Wachtwoord', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Inloggen', exact: true }).click()
    const root = '/admin/' + tenant.id
    await expect(page).toHaveURL(new RegExp(root + '(/.*)?$'))
    await expect(page.locator('html')).toHaveClass(/(?:^| )dark(?: |$)/)
    for (const collection of ['Pagina’s', 'Artikelen', 'Portfolio', 'Media', 'Instellingen']) {
      await expect(page.getByRole('link', { name: collection, exact: true }).first()).toBeVisible()
    }
    expect((await page.goto('/admin/' + other.id + '/pages'))?.status()).toBe(404)
    expect((await page.goto('/admin/platform'))?.status()).toBe(404)
    expect((await page.goto(root + '/settings/members'))?.status()).toBe(200)
    await expect(page.getByRole('cell', { name: email })).toBeVisible()
    const restrictedRoster = await context.request.get(
      '/api/cms-admin/site-members?site=' + other.id,
      {
        headers: { Origin: new URL(baseURL!).origin },
      },
    )
    expect(restrictedRoster.status()).toBe(403)
    await page.goto(root + '/settings?locale=en')
    await expect(page).toHaveURL(root + '/site-settings?locale=en')
    await page.getByRole('tab', { name: 'SEO', exact: true }).click()
    await page.getByRole('tab', { name: 'Algemeen' }).click()
    await page.locator('main').evaluate((node) => node.setAttribute('data-qa-persistent', 'shell'))
    const frame = page.getByTitle('Websitevoorbeeld', { exact: true })
    await frame.evaluate((node) => node.setAttribute('data-qa-persistent', 'frame'))
    await page.getByLabel('Websitenaam').fill('Unsaved setting')
    await page.getByRole('tab', { name: 'Navigatie' }).click()
    await expect(page).toHaveURL(root + '/site-settings?locale=en&panel=navigation')
    await expect(frame).toHaveAttribute('data-qa-persistent', 'frame')
    await page.getByRole('tab', { name: 'Algemeen' }).click()
    await expect(page.getByLabel('Websitenaam')).toHaveValue('Unsaved setting')
    await page
      .getByRole('navigation', { name: 'Instellingen' })
      .getByRole('link', { name: 'Voorkeuren' })
      .click()
    await page.getByRole('button', { name: 'Wijzigingen verwerpen' }).click()
    await expect(page.locator('main')).toHaveAttribute('data-qa-persistent', 'shell')
    await page.getByRole('radio', { name: 'English', exact: true }).click()
    await page.getByRole('button', { name: 'Wijzigingen opslaan' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await page.reload()
    await expect(page.getByRole('radio', { name: 'English', exact: true })).toBeChecked()
    await page.getByRole('button', { name: 'Reset to defaults' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl')
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

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByRole('button', { name: 'Language', exact: true })).toBeVisible()
    expect(
      await page.evaluate(() => window.document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390)

    page.once('dialog', (dialog) => dialog.accept())
    await page.goto(root + '/settings/assistant', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'AI assistant', exact: true })).toBeVisible()
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
    const previewFrame = page.getByTitle('Websitevoorbeeld', { exact: true })
    const previewSource = await previewFrame.getAttribute('src')
    expect(previewSource).toBeTruthy()
    const grant = new URL(previewSource!).searchParams.get('grant')
    const draftFeed = await context.request.get(feed + '&draft=true', {
      headers: { Authorization: 'Bearer ' + grant },
    })
    expect(await draftFeed.json()).toMatchObject({ homepage: { heading: 'Draft from shadcn' } })
    const alternate = new URL(previewSource!).searchParams.get('alternateGrant')
    expect(alternate).toBeTruthy()
    const englishFeed = '/api/site-content?tenant=' + slug + '&locale=en&draft=true'
    expect(
      (
        await context.request.get(englishFeed, { headers: { Authorization: 'Bearer ' + grant } })
      ).status(),
    ).toBe(401)
    const englishDraft = await context.request.get(englishFeed, {
      headers: { Authorization: 'Bearer ' + alternate },
    })
    expect(await englishDraft.json()).toMatchObject({ homepage: { heading: 'English heading' } })
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
    await page.goto('/admin/account')
    await expect(page.getByLabel('E-mailadres')).toHaveValue(email)
    const updatedPassword = randomUUID()
    await page.getByLabel('Huidig wachtwoord', { exact: true }).fill(password)
    await page.getByLabel('Nieuw wachtwoord', { exact: true }).fill(updatedPassword)
    await page.getByRole('button', { name: 'Wijzigingen opslaan' }).click()
    await expect(page).toHaveURL('/admin/login')
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
    let finishStatus!: () => void
    const statusGate = new Promise<void>((resolve) => {
      finishStatus = resolve
    })
    await page.route('**/api/assistant', async (route) => {
      if (route.request().postDataJSON()?.action === 'status') await statusGate
      return route.continue()
    })
    await page.goto(root + '/settings/assistant?panel=models')
    await expect(page.getByRole('heading', { name: 'AI-assistent', exact: true })).toBeVisible()
    await expect(page.getByText('Verbind een model om te beginnen.', { exact: true })).toHaveCount(
      0,
    )
    finishStatus()
    await expect(page.getByRole('cell', { name: 'gpt-6-luna' })).toBeVisible()
    await page.unroute('**/api/assistant')
    await page.getByRole('tab', { name: 'Modelverbinding' }).click()
    await page.getByRole('button', { name: 'Verbinding wijzigen' }).click()
    await expect(page.getByLabel('Model-ID')).toHaveValue('gpt-6-luna')
    await expect(page.getByLabel('API-sleutel')).toHaveValue('')
    await page.goto(root + '/pages?id=' + home.id)
    await page.getByRole('button', { name: 'Vraag AI' }).click()
    const drawer = page.getByRole('dialog')
    await expect(drawer.getByText('gpt-6-luna', { exact: true })).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'gpt-6-luna', exact: true })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.goto(root + '/settings/assistant?panel=models')
    await page.getByRole('button', { name: 'Model toevoegen' }).click()
    await page.getByLabel('Model-ID', { exact: true }).fill('gpt-5-mini')
    await page.getByLabel('Weergavenaam').fill('Fast model')
    await page.getByRole('button', { name: 'Toepassen', exact: true }).click()
    await page.getByRole('button', { name: 'Wijzigingen opslaan' }).click()
    await expect(page.getByText('Wijzigingen opgeslagen.', { exact: true })).toBeVisible()
    const catalog = await (await assistant({ action: 'status' })).json()
    const chosenModelID = catalog.models.find(
      ({ label }: { label: string }) => label === 'Fast model',
    ).id
    await page.route('**/api/assistant', async (route) => {
      const input = route.request().postDataJSON()
      if (input?.action !== 'chat-v2') return route.continue()
      expect(input.tenant).toBe(tenant.id)
      expect(input.modelID).toBe(chosenModelID)
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
    await page.goto(root + '/pages?id=' + home.id)
    await page.getByRole('button', { name: 'Vraag AI' }).click()
    await drawer.getByRole('button', { name: 'Model kiezen' }).click()
    await page.getByRole('textbox', { name: 'Zoek modellen' }).fill('Fast')
    await page.getByRole('button', { name: 'Fast model', exact: true }).click()
    await expect(drawer.getByRole('button', { name: 'Model kiezen' })).toHaveText('Fast model')
    await drawer.getByRole('button', { name: /^Antwoordlengte:/ }).click()
    await page.getByRole('menuitemradio', { name: 'Uitgebreid', exact: true }).click()
    await drawer.getByRole('button', { name: /^Redeneerinspanning:/ }).click()
    await page.getByRole('menuitemradio', { name: 'Laag', exact: true }).click()
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
    await page.getByRole('button', { name: 'Gespreksgeschiedenis' }).click()
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
      collection: 'site-settings',
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
