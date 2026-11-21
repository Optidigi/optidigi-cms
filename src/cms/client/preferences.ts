'use client'

import { languageCookie } from '../i18n'
import { preferencesKey, type Preferences } from '../preferences'
import { api } from './api'

// Payload's native preferences endpoint stores the value for the signed-in user.
export async function savePreferences(value: Preferences) {
  await api('payload-preferences/' + preferencesKey, { method: 'POST', json: { value } })
  document.cookie = `${languageCookie}=${value.language}; path=/; max-age=31536000; samesite=lax`
}
