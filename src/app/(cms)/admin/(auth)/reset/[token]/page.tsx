import { getTranslator } from '@/cms/server'
import { ResetForm } from '@/cms/auth/reset-form'

export async function generateMetadata() {
  return { title: (await getTranslator())('resetTitle') }
}

// Payload's forgot-password email links to {admin route}/reset/{token}.
export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <ResetForm token={token} />
}
