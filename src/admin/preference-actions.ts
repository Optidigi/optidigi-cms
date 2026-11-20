'use server'

import { cookies } from 'next/headers'
import { adminRequest, adminSites } from './data'
import { adminHTTP } from './http'
import { interfaceLanguageCookie } from './i18n'
import { preferencePath, preferenceSchema, readPreferences, type Preferences } from './preferences'

export async function savePreferences(value: Preferences | null) {
  const req = await adminRequest()
  const parsed = value === null ? undefined : preferenceSchema.safeParse(value)
  if (parsed && !parsed.success) return false
  if (
    parsed?.success &&
    parsed.data.website !== null &&
    !(await adminSites(req)).some(({ id }) => id === parsed.data.website)
  )
    return false

  const response = await adminHTTP(
    preferencePath,
    parsed?.success
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: parsed.data }),
        }
      : { method: 'DELETE' },
  )
  if (!response.ok && !(value === null && response.status === 404)) return false

  const jar = await cookies()
  if (parsed?.success) {
    const settings = {
      path: '/',
      sameSite: 'lax' as const,
      maxAge: 31536000,
      secure: process.env.NODE_ENV === 'production',
    }
    jar.set(interfaceLanguageCookie, parsed.data.language, settings)
    jar.set('sidebar_state', String(parsed.data.sidebarOpen), settings)
  } else {
    jar.delete(interfaceLanguageCookie)
    jar.delete('sidebar_state')
  }
  return true
}

export async function saveTheme(value: string) {
  if (value !== 'system' && value !== 'light' && value !== 'dark') return
  const existing = await readPreferences()
  if (existing) await savePreferences({ ...existing, theme: value })
}
