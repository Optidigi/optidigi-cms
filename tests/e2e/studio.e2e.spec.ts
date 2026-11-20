import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

test('Studio preserves published copy and tenant access when restoring a homepage draft', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000)
  const payload = await getPayload({ config })
  const suffix = randomUUID()
  const tenant = await payload.create({
    overrideAccess: true,
    collection: 'tenants',
    data: { name: 'Studio test', slug: 'studio-' + suffix, siteOrigin: 'https://example.com' },
  })
  try {
    const password = randomUUID()
    const actor = await payload.create({
      overrideAccess: true,
      collection: 'users',
      context: { bootstrapUser: true },
      data: {
        email: suffix + '@example.test',
        password,
        role: 'customer',
        tenants: [{ tenant: tenant.id, role: 'admin' }],
      },
    })
    const home = await payload.create({
      overrideAccess: true,
      collection: 'pages',
      locale: 'nl',
      data: {
        tenant: tenant.id,
        slug: 'home',
        title: 'Homepage',
        heading: 'Public Dutch copy',
        _status: 'published',
      },
    })
    const studio = '/studio/' + tenant.id + '?locale=en'
    await page.goto('/studio/login')
    await page.getByLabel('E-mailadres').fill(actor.email)
    await page.getByLabel('Wachtwoord').fill(password)
    await page.getByRole('button', { name: 'Inloggen' }).click()
    await expect(page).toHaveURL(/\/studio$/)
    await page.goto(studio)
    const stale = await context.newPage()
    await stale.goto(studio)

    const first = 'First English draft'
    await page.getByLabel('Kop', { exact: true }).fill(first)
    await expect(page.getByText('Concept opgeslagen.', { exact: true })).toBeVisible()
    await stale.getByLabel('Kop', { exact: true }).fill('Stale draft')
    await expect(stale.getByText(/Een andere wijziging is gevonden/)).toBeVisible()
    await expect(stale.getByLabel('Kop', { exact: true })).toHaveValue('Stale draft')
    await stale.close()

    const published = 'Public English copy'
    await page.getByLabel('Kop', { exact: true }).fill(published)
    await page.getByRole('button', { name: 'Publiceren', exact: true }).click()
    await expect(page.getByText('Homepage gepubliceerd.', { exact: true })).toBeVisible()

    await page.goto(studio)
    await page.getByText('Versiegeschiedenis', { exact: true }).click()
    await page.getByRole('button', { name: 'Herstel als concept' }).last().click()
    await expect(page.getByText('De vorige versie is als concept teruggezet.')).toBeVisible()
    await expect(page.getByLabel('Kop', { exact: true })).toBeVisible()
    for (const [locale, heading] of [
      ['nl', 'Public Dutch copy'],
      ['en', published],
    ] as const) {
      expect(
        await payload.findByID({
          overrideAccess: true,
          collection: 'pages',
          id: home.id,
          locale,
          fallbackLocale: false,
          draft: false,
          depth: 0,
        }),
      ).toMatchObject({ tenant: tenant.id, heading })
    }
  } finally {
    await payload.delete({
      overrideAccess: true,
      collection: 'pages',
      where: { tenant: { equals: tenant.id } },
    })
    await payload.delete({
      overrideAccess: true,
      collection: 'users',
      where: { email: { equals: suffix + '@example.test' } },
    })
    await payload.delete({ overrideAccess: true, collection: 'tenants', id: tenant.id })
    await payload.destroy()
  }
})
