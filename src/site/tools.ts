import { defineTool } from '@payloadcms/plugin-mcp'
import { z } from 'zod'
import { fetchPublicHTTPS } from '../assistant/outbound'
import { getAssistantTenantScope } from '../assistant/scope'
import { tenantIDs } from './access'

export const checkSitePage = defineTool({
  description: 'Check the HTTP status of a public page on the current tenant’s website.',
  annotations: { readOnlyHint: true },
  input: z.object({ path: z.string().max(512).default('/') }),
}).handler(async ({ input, req }) => {
  const memberships = tenantIDs(req.user)
  const tenantID = getAssistantTenantScope(req) ?? (memberships.length === 1 ? memberships[0] : undefined)
  const error = (text: string) => ({ isError: true, content: [{ type: 'text' as const, text }] })
  if (!tenantID) return error('Select a tenant first.')
  if (!/^\/(?![\/\\])/.test(input.path) || /[\\\s]/.test(input.path)) return error('Use a site-relative path.')

  const tenant = await req.payload.findByID({
    collection: 'tenants', id: tenantID, depth: 0, disableErrors: true, overrideAccess: false, req,
  })
  if (!tenant) return error('The tenant website is unavailable.')
  const url = new URL(input.path, tenant.siteOrigin)
  if (url.origin !== tenant.siteOrigin || url.hash) return error('Use a path on the tenant website.')

  try {
    const response = await fetchPublicHTTPS(url, { method: 'HEAD', signal: AbortSignal.timeout(8_000) })
    const result = { url: url.href, status: response.status, contentType: response.headers.get('content-type') }
    return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result }
  } catch {
    return error('The site did not respond, or the page redirected. Check the canonical address.')
  }
})
