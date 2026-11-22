import { getTranslator } from '@/cms/server'
import { ForgotForm } from '@/cms/auth/forgot-form'

export async function generateMetadata() {
  return { title: (await getTranslator())('forgotTitle') }
}

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams
  return <ForgotForm email={typeof email === 'string' ? email.slice(0, 254) : undefined} />
}
