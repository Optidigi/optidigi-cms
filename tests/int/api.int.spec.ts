import { randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import config from '@/payload.config'
import { assistantSiteHeader } from '@/assistant/scope'
import { relationID } from '@/site/access'
import { siteEndpoints } from '@/site/endpoints'
import { previewGrantStrategy, previewURL } from '@/site/preview'

const suffix = randomUUID().slice(0, 8)
let payload: Payload
let keyDirectory: string
let tenantA: number
let tenantB: number
let tenantC: number
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
  const [a, b, c] = await Promise.all(['a', 'b', 'c'].map((key) => payload.create({
    collection: 'tenants', overrideAccess: true,
    data: { name: key, slug: `test-${key}-${suffix}`, siteOrigin: 'https://optidigi.nl' },
  })))
  tenantA = a.id
  tenantB = b.id
  tenantC = c.id
  const user = await payload.create({
    collection: 'users', overrideAccess: true,
    context: { bootstrapUser: true },
    data: {
      email: `user-${suffix}@example.test`, password: randomUUID(), role: 'customer',
      tenants: [{ tenant: a.id, role: 'admin' }, { tenant: b.id, role: 'editor' }],
    },
  })
  actor = { ...user, collection: 'users' }
  const [page] = await Promise.all([a, b, c].map((tenant) => payload.create({
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
    const ids = [tenantA, tenantB, tenantC].filter(Boolean)
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
  it('lets anonymous readers see published content and public tenant fields only', async () => {
    const where = { tenant: { equals: tenantA } }
    const { docs } = await payload.find({ collection: 'pages', depth: 0, locale: 'nl', overrideAccess: false, where })
    expect(docs).toHaveLength(1)
    expect(docs[0].heading).toBe('Published')
    // The newest version is a draft, so draft reads return nothing to anonymous readers.
    expect((await payload.find({
      collection: 'pages', depth: 0, draft: true, locale: 'nl', overrideAccess: false, where,
    })).docs).toHaveLength(0)
    const { docs: [tenant] } = await payload.find({
      collection: 'tenants', depth: 0, overrideAccess: false,
      where: { slug: { equals: `test-a-${suffix}` } },
    })
    expect(tenant.slug).toBe(`test-a-${suffix}`)
    expect(tenant).not.toHaveProperty('siteOrigin')
    expect(tenant).not.toHaveProperty('name')
    expect((await payload.find({
      collection: 'pages', depth: 0, overrideAccess: false,
      where: { 'tenant.slug': { equals: `test-b-${suffix}` } },
    })).docs).toHaveLength(1)
  })

  it('limits signed-in users to their own tenants, drafts included', async () => {
    const { docs } = await payload.find({
      collection: 'pages', depth: 0, draft: true, locale: 'nl', overrideAccess: false, user: actor,
    })
    expect(docs.map(({ tenant }) => tenant).sort()).toEqual([tenantA, tenantB].sort())
    expect(docs.find(({ id }) => id === home)?.heading).toBe('Draft only')
  })

  it('allows the same slug on different websites but not twice on one website', async () => {
    const admin = { ...actor, role: 'platform-admin' as const }
    const created = await Promise.all([tenantA, tenantB].map((tenant) => payload.create({
      collection: 'articles', locale: 'nl', overrideAccess: false, user: admin,
      data: { tenant, slug: `shared-${suffix}`, title: 'Shared', _status: 'published' },
    })))
    expect(created.map(({ slug }) => slug)).toEqual([`shared-${suffix}`, `shared-${suffix}`])
    await expect(payload.create({
      collection: 'articles', locale: 'nl', overrideAccess: false, user: admin,
      data: { tenant: tenantA, slug: `shared-${suffix}`, title: 'Again', _status: 'published' },
    })).rejects.toThrow()
    await payload.delete({ collection: 'articles', overrideAccess: true, where: { slug: { equals: `shared-${suffix}` } } })
  })

  it('refuses first-user registration outside the bootstrap command', async () => {
    await expect(payload.create({
      collection: 'users', overrideAccess: true,
      data: { email: `unauthorized-${suffix}@example.test`, password: randomUUID(), role: 'platform-admin' },
    })).rejects.toThrow()
  })

  it('keeps versions, drafts and private tenant fields away from anonymous readers', async () => {
    await expect(payload.findVersions({ collection: 'pages', overrideAccess: false })).rejects.toThrow()
    const draftOnly = await payload.create({
      collection: 'articles', locale: 'nl', overrideAccess: true, draft: true,
      data: { tenant: tenantA, slug: `draft-${suffix}`, title: 'Draft', _status: 'draft' },
    })
    await expect(payload.findByID({
      collection: 'articles', id: draftOnly.id, draft: true, overrideAccess: false,
    })).rejects.toThrow()
    await expect(payload.find({
      collection: 'tenants', overrideAccess: false, where: { siteOrigin: { equals: 'https://optidigi.nl' } },
    })).rejects.toThrow()
    await payload.delete({ collection: 'articles', id: draftOnly.id, overrideAccess: true })
  })

  it('serves published site settings to anonymous readers', async () => {
    await payload.create({
      collection: 'site-settings', locale: 'nl', overrideAccess: true,
      data: { tenant: tenantA, name: 'Site A', _status: 'published' },
    })
    const { docs } = await payload.find({
      collection: 'site-settings', overrideAccess: false, depth: 0,
      where: { 'tenant.slug': { equals: `test-a-${suffix}` } },
    })
    expect(docs.map(({ name }) => name)).toEqual(['Site A'])
    await payload.delete({ collection: 'site-settings', overrideAccess: true, where: { tenant: { equals: tenantA } } })
  })

  it('limits AI requests to the chat website even when the user belongs to more websites', async () => {
    const req = request('https://cms.optidigi.nl/api/mcp')
    req.headers.set(assistantSiteHeader, String(tenantA))
    const { docs } = await payload.find({ collection: 'pages', depth: 0, draft: true, overrideAccess: false, req })
    expect(docs.map(({ tenant }) => tenant)).toEqual([tenantA])
    const { docs: [other] } = await payload.find({
      collection: 'pages', depth: 0, overrideAccess: true, where: { tenant: { equals: tenantB } },
    })
    await expect(payload.update({
      collection: 'pages', id: other.id, data: { heading: 'Changed by AI' }, overrideAccess: false, req,
    })).rejects.toThrow()
    await expect(payload.create({
      collection: 'articles', locale: 'nl', overrideAccess: false, req,
      data: { tenant: tenantB, slug: `ai-${suffix}`, title: 'Wrong site' },
    })).rejects.toThrow()
    const created = await payload.create({
      collection: 'articles', locale: 'nl', overrideAccess: false, req,
      data: { slug: `ai-${suffix}`, title: 'Right site' } as never,
    })
    expect(relationID(created.tenant)).toBe(tenantA)
    await payload.delete({ collection: 'articles', id: created.id, overrideAccess: true })
  })

  it('limits AI version reads and media to the chat website', async () => {
    const req = request('https://cms.optidigi.nl/api/mcp')
    req.headers.set(assistantSiteHeader, String(tenantA))
    const versions = await payload.findVersions({ collection: 'pages', depth: 0, overrideAccess: false, req })
    expect(versions.docs.length).toBeGreaterThan(0)
    expect(new Set(versions.docs.map(({ version }) => relationID(version.tenant)))).toEqual(new Set([tenantA]))
    const media = await payload.find({ collection: 'media', depth: 0, overrideAccess: false, req })
    expect(media.docs.every(({ tenant }) => relationID(tenant) === tenantA)).toBe(true)
  })

  it('signs a preview grant in as a read-only editor of its website only', async () => {
    const preview = await previewURL('pages', home, 'nl', request('https://cms.optidigi.nl/api'))
    const grant = new URL(preview!).searchParams.get('grant')!
    const headers = new Headers({ authorization: `Bearer ${grant}` })
    const signIn = (method: string, url: string) =>
      previewGrantStrategy.authenticate({ headers, payload, req: { method, url } as PayloadRequest })
    const { user } = await signIn('GET', 'https://cms.optidigi.nl/api/pages?draft=true')
    expect(user?.id).toBe(actor.id)
    // Only reads of website content: no writes, no requests without a method, no other API paths.
    expect((await signIn('POST', 'https://cms.optidigi.nl/api/pages')).user).toBeNull()
    expect((await signIn('GET', 'https://cms.optidigi.nl/api/users/me')).user).toBeNull()
    expect((await signIn('GET', 'https://cms.optidigi.nl/api/assistant-threads')).user).toBeNull()
    expect((await payload.auth({ headers })).user).toBeNull()
    expect(user?.tenants?.map(({ tenant }) => relationID(tenant))).toEqual([tenantA])
    const { docs } = await payload.find({ collection: 'pages', depth: 0, draft: true, locale: 'nl', overrideAccess: false, user })
    expect(docs.map(({ tenant }) => relationID(tenant))).toEqual([tenantA])
    expect(docs[0].heading).toBe('Draft only')
    const forged = grant.slice(0, -2) + (grant.endsWith('AA') ? 'BB' : 'AA')
    expect((await previewGrantStrategy.authenticate({
      headers: new Headers({ authorization: `Bearer ${forged}` }), payload, req: { method: 'GET', url: 'https://cms.optidigi.nl/api/pages' } as PayloadRequest,
    })).user).toBeNull()
  })

  it('keeps assistant chats private to their author and model keys unreadable', async () => {
    const thread = await payload.create({
      collection: 'assistant-threads', overrideAccess: false, user: actor,
      data: { tenant: tenantA, title: 'Mine', messages: [] },
    })
    const other = await payload.create({
      collection: 'users', overrideAccess: true, context: { bootstrapUser: true },
      data: { email: `other-${suffix}@example.test`, password: randomUUID(), role: 'customer', tenants: [{ tenant: tenantA, role: 'admin' }] },
    })
    const otherUser = { ...other, collection: 'users' as const }
    expect((await payload.find({ collection: 'assistant-threads', overrideAccess: false, user: otherUser })).docs).toHaveLength(0)
    expect((await payload.find({ collection: 'assistant-threads', overrideAccess: false, user: actor })).docs.map(({ id }) => id)).toEqual([thread.id])
    const settings = await payload.create({
      collection: 'assistant-settings', overrideAccess: true,
      data: { tenant: tenantA, provider: 'anthropic', models: ['model-a'], apiKey: 'secret-key' },
    })
    const raw = await payload.findByID({ collection: 'assistant-settings', id: settings.id, overrideAccess: true })
    expect(raw.apiKey).not.toBe('secret-key')
    expect(payload.decrypt(raw.apiKey!)).toBe('secret-key')
    const visible = await payload.findByID({ collection: 'assistant-settings', id: settings.id, overrideAccess: false, user: actor })
    expect(visible).not.toHaveProperty('apiKey')
    expect(visible.models).toEqual(['model-a'])
    await payload.delete({ collection: 'assistant-threads', id: thread.id, overrideAccess: true })
    await payload.delete({ collection: 'assistant-settings', id: settings.id, overrideAccess: true })
    await payload.delete({ collection: 'users', id: other.id, overrideAccess: true })
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
