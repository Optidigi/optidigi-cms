'use server'

import config from '@payload-config'
import { login, logout } from '@payloadcms/next/auth'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { isPlatformAdmin, tenantIDs } from '@/site/access'

export async function signInComparison(_previous: string, form: FormData): Promise<string> {
  const input = z
    .object({ email: z.email().max(254), password: z.string().min(1).max(1024) })
    .safeParse(Object.fromEntries(form))
  if (!input.success) return 'Vul je e-mailadres en wachtwoord in.'
  const destination = await login({ config, collection: 'users', ...input.data })
    .then(({ user }) => {
      if (!user) return undefined
      const firstSite = tenantIDs(user)[0]
      if (firstSite) return '/admin-shadcn/' + firstSite
      return isPlatformAdmin(user) ? '/admin-shadcn/platform' : '/admin-shadcn'
    })
    .catch(() => undefined)
  if (!destination) {
    return 'Inloggen is niet gelukt. Controleer je e-mailadres en wachtwoord.'
  }
  redirect(destination)
}

export async function signOutComparison() {
  await logout({ config })
  redirect('/admin-shadcn/login')
}
