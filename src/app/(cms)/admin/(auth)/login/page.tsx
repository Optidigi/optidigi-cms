import { redirect } from 'next/navigation'
import { getSession, getTranslator } from '@/cms/server'
import { LoginForm } from '@/cms/auth/login-form'

export async function generateMetadata() {
  return { title: (await getTranslator())('signIn') }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect: target } = await searchParams
  // Only same-origin paths. Payload's MCP OAuth flow sends users here with an /api/mcp/... path.
  const destination = target && /^\/(?![/\\])/.test(target) ? target : '/admin'
  if ((await getSession()).user) redirect(destination)
  return <LoginForm destination={destination} />
}
