import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'
import { relationID } from './access'

// Tells a website to refresh after published content changes, modelled on the revalidate hooks in
// Payload's website template. Only websites with a refresh URL are called; failures are logged.
async function notify(req: PayloadRequest, collection: string, doc: { tenant?: unknown; slug?: unknown }) {
  const tenantID = relationID(doc.tenant)
  if (!tenantID || req.context.disableRevalidate) return
  const tenant = await req.payload.findByID({
    collection: 'tenants', id: tenantID, depth: 0, disableErrors: true, overrideAccess: true, req,
    select: { refreshUrl: true, refreshSecret: true },
  })
  if (!tenant?.refreshUrl) return
  try {
    const response = await fetch(tenant.refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tenant.refreshSecret ? { Authorization: `Bearer ${req.payload.decrypt(tenant.refreshSecret)}` } : {}),
      },
      body: JSON.stringify({ collection, slug: typeof doc.slug === 'string' ? doc.slug : null, locale: req.locale ?? null }),
      redirect: 'error',
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) req.payload.logger.warn({ msg: 'Website refresh failed', collection, status: response.status })
  } catch (error) {
    req.payload.logger.warn({ err: error, msg: 'Website refresh failed', collection })
  }
}

export const refreshAfterChange: CollectionAfterChangeHook = async ({ collection, doc, previousDoc, req }) => {
  if (doc?._status === 'published' || previousDoc?._status === 'published') await notify(req, collection.slug, doc)
  return doc
}

export const refreshAfterDelete: CollectionAfterDeleteHook = async ({ collection, doc, req }) => {
  if (doc?._status === 'published') await notify(req, collection.slug, doc)
  return doc
}
