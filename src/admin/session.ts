'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminHTTP } from './http'

export async function signOutAdmin() {
  await adminHTTP('users/logout', { method: 'POST' })
  const jar = await cookies()
  jar.delete('payload-token')
  redirect('/admin/login')
}
