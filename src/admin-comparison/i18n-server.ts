import { cookies } from 'next/headers'
import { interfaceLanguageCookie, translate, type InterfaceLanguage } from './i18n'

export async function getInterfaceLanguage(): Promise<InterfaceLanguage> {
  return (await cookies()).get(interfaceLanguageCookie)?.value === 'en' ? 'en' : 'nl'
}

export async function comparisonTranslations() {
  const language = await getInterfaceLanguage()
  return (text: string) => translate(language, text)
}
