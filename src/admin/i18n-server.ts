import { readPreferences } from './preferences'
import { cookies } from 'next/headers'
import { interfaceLanguageCookie, translate, type InterfaceLanguage } from './i18n'

export async function getInterfaceLanguage(): Promise<InterfaceLanguage> {
  const preferred = await readPreferences()
  if (preferred) return preferred.language
  return (await cookies()).get(interfaceLanguageCookie)?.value === 'en' ? 'en' : 'nl'
}

export async function adminTranslations() {
  const language = await getInterfaceLanguage()
  return (text: string) => translate(language, text)
}
