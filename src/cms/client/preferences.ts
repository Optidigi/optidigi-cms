'use client'

import { languageCookie } from '../i18n'
import { preferencesKey, type Preferences } from '../preferences'
import { api } from './api'

// Saves run one after another and each merges its change onto the newest saved value, so two
// saves at once (a page load remembering the website while the language changes) can't create
// duplicate rows in Payload's preferences upsert or overwrite each other with stale values.
let queue: Promise<unknown> = Promise.resolve()
let latest: Preferences | undefined

// Payload's native preferences endpoint stores the value for the signed-in user.
export function savePreferences(current: Preferences, change: Partial<Preferences>) {
  const run = queue.then(async () => {
    const value = { ...(latest ?? current), ...change }
    await api('payload-preferences/' + preferencesKey, { method: 'POST', json: { value } })
    latest = value
    document.cookie = `${languageCookie}=${value.language}; path=/; max-age=31536000; samesite=lax`
  })
  queue = run.catch(() => undefined)
  return run
}
