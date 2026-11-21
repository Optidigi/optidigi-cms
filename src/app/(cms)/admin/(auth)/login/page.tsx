import { redirect } from 'next/navigation'
import { getSession, getTranslator } from '@/cms/server'
import { LoginForm } from '@/cms/auth/login-form'

export async function generateMetadata() {
  return { title: (await getTranslator())('signIn') }
}

// Only paths on this site. Payload's MCP OAuth flow sends users here with an /api/mcp/... path.
function sameOriginPath(target?: string) {
  if (!target) return '/admin'
  const base = 'https://cms.invalid'
  try {
    const url = new URL(target, base)
    return url.origin === base ? url.pathname + url.search + url.hash : '/admin'
  } catch {
    return '/admin'
  }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect: target } = await searchParams
  const destination = sameOriginPath(target)
  if ((await getSession()).user) redirect(destination)
  return <LoginForm destination={destination} />
}
