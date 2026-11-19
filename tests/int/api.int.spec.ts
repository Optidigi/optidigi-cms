import { randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import config from '@/payload.config'
import { assistantScopeHeader, createAssistantScope } from '@/assistant/scope'
import { siteEndpoints } from '@/site/endpoints'
import { previewURL } from '@/site/preview'

const suffix = randomUUID().slice(0, 8)
let payload: Payload
let keyDirectory: string
let tenantA: number
let tenantB: number
let home: number
let actor: NonNullable<PayloadRequest['user']>

function request(url: string, headers = new Headers()) {
  return Object.assign(new Request(url, { headers }), {
    payload, user: actor, context: {}, t: (key: string) => key,
  }) as unknown as PayloadRequest
}

beforeAll(async () => {
  payload = await getPayload({ config })
  keyDirectory = await mkdtemp(join(tmpdir(), 'optidigi-preview-'))
  process.env.PREVIEW_SIGNING_KEY_FILE = join(keyDirectory, 'key')
  await writeFile(process.env.PREVIEW_SIGNING_KEY_FILE, 'ab'.repeat(32), { mode: 0o600 })
  const [a, b] = await Promise.all(['a', 'b'].map((key) => payload.create({
    collection: 'tenants', overrideAccess: true,
    data: { name: key, slug: `test-${key}-${suffix}`, siteOrigin: 'https://optidigi.nl' },
  })))
  tenantA = a.id
  tenantB = b.id
  const user = await payload.create({
    collection: 'users', overrideAccess: true,
    context: { bootstrapUser: true },
    data: {
      email: `user-${suffix}@example.test`, password: randomUUID(), role: 'customer',
      tenants: [{ tenant: a.id, role: 'admin' }, { tenant: b.id, role: 'editor' }],
    },
  })
  actor = { ...user, collection: 'users' }
  const [page] = await Promise.all([a, b].map((tenant) => payload.create({
    collection: 'pages', locale: 'nl', overrideAccess: true,
    data: { tenant: tenant.id, slug: 'home', title: tenant.name, heading: 'Published', _status: 'published' },
  })))
  home = page.id
  await payload.update({
    collection: 'pages', id: home, draft: true, locale: 'nl', overrideAccess: true,
    data: { heading: 'Draft only' },
  })
}, 30_000)

afterAll(async () => {
  if (payload) {
    const ids = [tenantA, tenantB].filter(Boolean)
    if (ids.length) {
      await payload.delete({ collection: 'pages', overrideAccess: true, where: { tenant: { in: ids } } })
      if (actor) await payload.delete({ collection: 'users', overrideAccess: true, id: actor.id })
      await payload.delete({ collection: 'tenants', overrideAccess: true, where: { id: { in: ids } } })
    }
    await payload.destroy()
  }
  if (keyDirectory) await rm(keyDirectory, { recursive: true, force: true })
})

describe('tenant content', () => {
  it('denies unauthenticated generic reads and scopes the assistant to the selected tenant', async () => {
    await expect(payload.find({ collection: 'pages', overrideAccess: false })).rejects.toThrow()
    const req = request('https://cms.optidigi.nl/api/mcp')
    req.headers.set(assistantScopeHeader, createAssistantScope(req, tenantA))
    const result = await payload.find({ collection: 'pages', depth: 0, overrideAccess: false, req })
    expect(result.docs).toHaveLength(1)
    expect(result.docs[0].tenant).toBe(tenantA)
    // Payload strips tenant changes at field access before invoking collection hooks.
    const updated = await payload.update({
      collection: 'pages', id: home, data: { tenant: tenantB },
      depth: 0, draft: true, overrideAccess: false, req,
    })
    expect(updated.tenant).toBe(tenantA)
    expect(await payload.find({
      collection: 'pages', where: { tenant: { equals: tenantB } }, overrideAccess: false, req,
    })).toMatchObject({ docs: [] })
  })

  it('blocks public first-user creation even through an access override', async () => {
    await expect(payload.create({
      collection: 'users', overrideAccess: true,
      data: { email: `unauthorized-${suffix}@example.test`, password: randomUUID(), role: 'platform-admin' },
    })).rejects.toThrow()
  })

  it('serves published content and only returns drafts under a tenant-bound grant', async () => {
    const endpoint = siteEndpoints.find(({ path }) => path === '/site-content')!
    const makeURL = (tenant: string) =>
      `https://cms.optidigi.nl/api/site-content?tenant=test-${tenant}-${suffix}&locale=nl`
    const published = await endpoint.handler(request(makeURL('a')))
    expect(await published.json()).toMatchObject({ homepage: { heading: 'Published' } })

    const preview = await previewURL('pages', home, 'nl', request('https://cms.optidigi.nl/api'))
    expect(preview).toBeTruthy()
    const grant = new URL(preview!).searchParams.get('grant')!
    const headers = new Headers({ authorization: `Bearer ${grant}` })
    const draft = await endpoint.handler(request(makeURL('a') + '&draft=true', headers))
    expect(await draft.json()).toMatchObject({ homepage: { heading: 'Draft only' } })
    expect(draft.headers.get('cache-control')).toBe('no-store')
    expect((await endpoint.handler(request(makeURL('a') + '&draft=true'))).status).toBe(401)
    expect((await endpoint.handler(request(makeURL('b') + '&draft=true', headers))).status).toBe(401)
  })
})
