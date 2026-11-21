import { getTranslator } from '@/cms/server'
import { ForgotForm } from '@/cms/auth/forgot-form'

export async function generateMetadata() {
  return { title: (await getTranslator())('forgotTitle') }
}

export default function ForgotPage() {
  return <ForgotForm />
}
