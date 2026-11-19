import { createHmac, timingSafeEqual } from 'node:crypto'
import { APIError, type PayloadRequest } from 'payload'

import { assistantMemberships } from './scope-shared'

export const assistantScopeHeader = 'x-optidigi-assistant-tenant'

export { assistantMemberships } from './scope-shared'
export function signAssistantGrant(
  req: PayloadRequest,
  purpose: 'scope' | 'delete',
  data: unknown,
) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  const signature = createHmac('sha256', req.payload.secret)
    .update(`optidigi-assistant:${purpose}:${payload}`)
    .digest('base64url')
  return `${payload}.${signature}`
}

export function readAssistantGrant(
  req: PayloadRequest,
  purpose: 'scope' | 'delete',
  grant: string,
): unknown {
  const [payload, signature, extra] = grant.split('.')
  if (!payload || !signature || extra !== undefined || grant.length > 2048) return null
  const expected = createHmac('sha256', req.payload.secret)
    .update(`optidigi-assistant:${purpose}:${payload}`)
    .digest()
  const supplied = Buffer.from(signature, 'base64url')
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch {
    return null
  }
}

export function getAssistantTenantScope(req: PayloadRequest): number | undefined {
  const scope = req.headers.get(assistantScopeHeader)
  if (scope === null) return undefined
  const grant = readAssistantGrant(req, 'scope', scope) as {
    tenant?: number
    user?: number | string
    expiresAt?: number
  } | null
  if (
    !req.user ||
    !grant ||
    grant.user !== req.user.id ||
    !grant.expiresAt ||
    grant.expiresAt < Date.now() ||
    !assistantMemberships(req.user).some(({ id }) => id === grant.tenant)
  ) {
    throw new APIError('Invalid assistant tenant scope.', 403)
  }
  return grant.tenant
}

export function createAssistantScope(req: PayloadRequest, tenant: number) {
  return signAssistantGrant(req, 'scope', {
    tenant,
    user: req.user?.id,
    expiresAt: Date.now() + 120_000,
  })
}
