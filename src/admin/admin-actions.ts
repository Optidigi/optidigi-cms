'use server'

import { settingsHref } from './navigation'
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

export async function savePlatform(
  form: FormData,
): Promise<{ url?: string; field?: string; message?: string }> {
  form.set('fieldErrors', 'true')
  const response = await adminHTTP('cms-admin/platform', { method: 'POST', body: form })
  const failure = { message: 'Opslaan is niet gelukt. Controleer de invoer.' }
  if (!response.ok) return failure
  const saved: unknown = await response.json()
  if (saved !== true) {
    if (saved && typeof saved === 'object' && 'field' in saved && typeof saved.field === 'string') {
      return {
        field: saved.field,
        message: 'Controleer dit veld en gebruik een unieke waarde waar nodig.',
      }
    }
    return failure
  }
  return {
    url: settingsHref(
      '/admin/platform',
      relationID(form.get('website')),
      form.get('locale') === 'en' ? 'en' : 'nl',
      {
        result: 'saved',
        ...(form.get('kind') === 'user' && { group: 'users' }),
      },
    ),
  }
}
