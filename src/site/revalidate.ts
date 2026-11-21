import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'
import { relationID } from './access'

// Tells a website to refresh after published content changes, modelled on the revalidate hooks in
// Payload's website template. Only websites with a refresh URL are called; failures are logged.
// The call doesn't hold up the save, and it can arrive just before the save commits, so websites
// should mark their cache stale rather than refetch immediately.
async function notify(
  req: PayloadRequest,
  collection: string,
  doc: { tenant?: unknown; slug?: unknown },
  previousSlug?: unknown,
) {
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
      // Publishing covers every translation, so no locale is sent. A renamed document also sends its old slug.
      body: JSON.stringify({
        collection,
        slug: typeof doc.slug === 'string' ? doc.slug : null,
        previousSlug: typeof previousSlug === 'string' && previousSlug !== doc.slug ? previousSlug : null,
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) req.payload.logger.warn({ msg: 'Website refresh failed', collection, status: response.status })
  } catch (error) {
    req.payload.logger.warn({ err: error, msg: 'Website refresh failed', collection })
  }
}

export const refreshAfterChange: CollectionAfterChangeHook = async ({ collection, doc, previousDoc, req }) => {
  if (doc?._status === 'published' || previousDoc?._status === 'published') {
    void notify(req, collection.slug, doc, previousDoc?.slug)
  }
  return doc
}

export const refreshAfterDelete: CollectionAfterDeleteHook = async ({ collection, doc, req }) => {
  if (doc?._status === 'published') void notify(req, collection.slug, doc)
  return doc
}
