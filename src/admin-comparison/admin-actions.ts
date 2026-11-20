'use server'

import config from '@payload-config'
import { login, logout } from '@payloadcms/next/auth'
import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import { isPlatformAdmin, relationID } from '@/site/access'
import { comparisonRequest } from './data'

const password = z.string().min(12).max(256)
const id = z.coerce.number().int().positive()
const email = z.email().max(254)

export async function saveAccount(_status: string, form: FormData): Promise<string> {
  const req = await comparisonRequest()
  const actor = req.user
  if (actor?.collection !== 'users') return 'Open de accountpagina opnieuw.'
  const input = z
    .object({
      email,
      currentPassword: z.string().min(1).max(1024),
      password: z.union([password, z.literal('')]),
    })
    .safeParse(Object.fromEntries(form))
  if (!input.success)
    return 'Gebruik een geldig e-mailadres en minimaal 12 tekens voor een nieuw wachtwoord.'
  if (input.data.email === actor.email && !input.data.password) return 'Er zijn geen wijzigingen.'
  try {
    const verification = await login({
      collection: 'users',
      config,
      email: actor.email,
      password: input.data.currentPassword,
    })
    if (verification.user?.id !== actor.id) throw Error('Current account could not be verified')
    await req.payload.update({
      collection: 'users',
      id: actor.id,
      req,
      overrideAccess: false,
      data: {
        email: input.data.email,
        ...(input.data.password ? { password: input.data.password } : {}),
      },
    })
    await logout({ config })
  } catch {
    return 'Opslaan is niet gelukt. Controleer je huidige wachtwoord of probeer een ander e-mailadres.'
  }
  redirect('/admin-shadcn/login?updated=1')
}

export async function savePlatform(form: FormData) {
  const req = await comparisonRequest()
  if (!isPlatformAdmin(req.user)) notFound()
  const candidate = form.get('id')
  const updateID = candidate ? relationID(candidate) : undefined
  const options = { req, overrideAccess: false as const, depth: 0 as const }
  let success = false
  try {
    if (candidate && !updateID) throw Error('Invalid record')
    if (form.get('kind') === 'site') {
      const data = z
        .object({
          name: z.string().trim().min(1).max(150),
          slug: z
            .string()
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
            .max(80),
          siteOrigin: z.url({ protocol: /^https$/ }),
        })
        .parse(Object.fromEntries(form))
      if (new URL(data.siteOrigin).origin !== data.siteOrigin) throw Error('Invalid origin')
      if (updateID)
        await req.payload.update({
          ...options,
          collection: 'tenants',
          id: updateID,
          data,
          overrideLock: false,
        })
      else await req.payload.create({ ...options, collection: 'tenants', data })
      success = true
    }
    if (form.get('kind') === 'user') {
      if (updateID === req.user?.id) throw Error('Use personal account settings')
      const data = z
        .object({
          email,
          role: z.enum(['customer', 'platform-admin']),
          password: z.union([password, z.literal('')]),
        })
        .parse(Object.fromEntries(form))
      const tenants = [...form.entries()].flatMap(([key, value]) => {
        const match = key.match(/^membership-(\d+)$/)
        return match && value
          ? [{ tenant: id.parse(match[1]), role: z.enum(['editor', 'admin']).parse(value) }]
          : []
      })
      if (
        tenants.length > 100 ||
        new Set(tenants.map(({ tenant }) => tenant)).size !== tenants.length
      ) {
        throw Error('Invalid memberships')
      }
      const update = {
        email: data.email,
        role: data.role,
        tenants,
        ...(data.password && { password: data.password }),
      }
      if (updateID)
        await req.payload.update({
          ...options,
          collection: 'users',
          id: updateID,
          data: update,
          overrideLock: false,
        })
      else {
        if (!data.password) throw Error('Password required')
        await req.payload.create({
          ...options,
          collection: 'users',
          data: { ...update, password: data.password },
        })
      }
      success = true
    }
  } catch {}
  const website = relationID(form.get('website'))
  redirect(
    '/admin-shadcn/platform?result=' +
      (success ? 'saved' : 'failed') +
      (website ? '&website=' + website : ''),
  )
}
