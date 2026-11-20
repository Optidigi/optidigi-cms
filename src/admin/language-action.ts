'use server'

import { cookies } from 'next/headers'
import { interfaceLanguageCookie } from './i18n'

export async function setInterfaceLanguage(language: string) {
  if (language !== 'en' && language !== 'nl') return
  const jar = await cookies()
  jar.set(interfaceLanguageCookie, language, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  })
}
