'use server'

import config from '@payload-config'
import { login, logout } from '@payloadcms/next/auth'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { isPlatformAdmin } from '../site/access'
import { studioRequest } from './data'

const id = z.coerce.number().int().positive()

export async function saveStudioAdministration(form: FormData) {
  const req = await studioRequest()
  if (!isPlatformAdmin(req.user)) redirect('/studio')
  const options = { req, overrideAccess: false as const, depth: 0 as const }
  const updateID = id.safeParse(form.get('id')).data
  let result = 'saved'
  try {
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
      if (new URL(data.siteOrigin).origin !== data.siteOrigin) throw Error('Use an origin')
      if (updateID)
        await req.payload.update({ ...options, collection: 'tenants', id: updateID, data })
      else await req.payload.create({ ...options, collection: 'tenants', data })
    } else if (form.get('kind') === 'user') {
      const email = z.email().parse(form.get('email'))
      const role = z.enum(['customer', 'platform-admin']).parse(form.get('role'))
      const password = z.string().max(256).parse(form.get('password'))
      const tenants = [...form.entries()].flatMap(([key, value]) => {
        const match = key.match(/^membership-(\d+)$/)
        return match && value
          ? [{ tenant: id.parse(match[1]), role: z.enum(['editor', 'admin']).parse(value) }]
          : []
      })
      if (tenants.length > 100) throw Error('Too many sites')
      if (updateID === req.user?.id || (password && password.length < 12))
        throw Error('Invalid change')
      if (updateID) {
        await req.payload.update({
          ...options,
          collection: 'users',
          id: updateID,
          data: { email, role, tenants, ...(password && { password }) },
        })
      } else {
        if (password.length < 12) throw Error('Missing password')
        await req.payload.create({
          ...options,
          collection: 'users',
          data: { email, password, role, tenants },
        })
      }
    } else {
      throw Error('Unknown operation')
    }
  } catch {
    result = 'failed'
  }
  redirect('/studio/administration?result=' + result)
}

export async function changeStudioPassword(form: FormData) {
  const req = await studioRequest()
  const actor = req.user
  if (!actor?.email) redirect('/studio/login')
  const parsed = z
    .object({
      currentPassword: z.string().min(1).max(256),
      password: z.string().min(12).max(256),
    })
    .safeParse(Object.fromEntries(form))
  if (!parsed.success) redirect('/studio/account?result=failed')
  try {
    await login({
      collection: 'users',
      config,
      email: actor.email,
      password: parsed.data.currentPassword,
    })
    await req.payload.update({
      collection: 'users',
      id: actor.id,
      req,
      overrideAccess: false,
      data: { password: parsed.data.password },
    })
    await logout({ config })
  } catch {
    redirect('/studio/account?result=failed')
  }
  redirect('/studio/login')
}
