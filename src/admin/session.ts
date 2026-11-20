'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminHTTP } from './http'
import { payloadSessionCookie } from './auth-contract'

async function clearSession() {
  const response = await adminHTTP('users/logout', { method: 'POST' })
  const expired = response.headers
    .getSetCookie()
    .map((header) => header.match(/^([\w-]+)=;/)?.[1])
    .filter((name): name is string => Boolean(name))
  const jar = await cookies()
  for (const name of expired) jar.delete(name)
  jar.delete(payloadSessionCookie)
}

export async function signOutAdmin() {
  await clearSession()
  redirect('/admin/login')
}

export async function signOutAfterAccountChange() {
  await clearSession()
  redirect('/admin/login?updated=1')
}
