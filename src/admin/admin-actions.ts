'use server'

import { redirect } from 'next/navigation'
import { relationID } from '@/site/access'
import { adminHTTP } from './http'
import { signOutAdmin } from './session'

export async function saveAccount(_status: string, form: FormData): Promise<string> {
  const response = await adminHTTP('cms-admin/account', { method: 'POST', body: form })
  if (!response.ok) return 'Open de accountpagina opnieuw.'
  const message: string = await response.json()
  if (message) return message
  await signOutAdmin()
  return ''
}

export async function savePlatform(form: FormData) {
  const response = await adminHTTP('cms-admin/platform', { method: 'POST', body: form })
  const success = response.ok && (await response.json()) === true
  const website = relationID(form.get('website'))
  redirect('/admin/platform?result=' + (success ? 'saved' : 'failed') + (website ? '&website=' + website : ''))
}
