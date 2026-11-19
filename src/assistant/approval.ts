import { randomUUID } from 'node:crypto'
import { APIError, type PayloadRequest } from 'payload'
import { readAssistantGrant, signAssistantGrant } from './scope'

export const deletableCollections = ['pages', 'articles', 'projects', 'media'] as const
type DeletableCollection = (typeof deletableCollections)[number]

type Target = {
  collection: DeletableCollection
  id: number
}

type DeleteGrant = Target & {
  tenant: number
  user: string | number
  updatedAt: string
  expiresAt: number
  nonce: string
}

async function currentTarget(req: PayloadRequest, tenant: number, { collection, id }: Target) {
  const doc = (await req.payload.findByID({
    collection: collection,
    depth: 0,
    disableErrors: true,
    id,
    overrideAccess: false,
    req,
  })) as { tenant?: number; title?: string; filename?: string; updatedAt?: string } | null
  if (!doc || doc.tenant !== tenant || !doc.updatedAt) {
    throw new APIError('The document is unavailable in this tenant.', 404)
  }
  return { label: doc.title || doc.filename || String(id), updatedAt: doc.updatedAt }
}

export async function proposeDelete(req: PayloadRequest, tenant: number, target: Target) {
  const { label, updatedAt } = await currentTarget(req, tenant, target)
  const grant = {
    ...target,
    tenant,
    user: req.user!.id,
    updatedAt,
    expiresAt: Date.now() + 5 * 60_000,
    nonce: randomUUID(),
  }
  return { ...target, label, token: signAssistantGrant(req, 'delete', grant) }
}

export async function confirmDelete(req: PayloadRequest, tenant: number, token: string) {
  const grant = readAssistantGrant(req, 'delete', token) as DeleteGrant | null
  if (
    !grant ||
    grant.user !== req.user?.id ||
    grant.tenant !== tenant ||
    grant.expiresAt < Date.now()
  ) {
    throw new APIError('This approval is invalid or has expired.', 403)
  }

  const current = await currentTarget(req, tenant, grant)
  if (current.updatedAt !== grant.updatedAt) {
    throw new APIError('The document changed. Ask for a new delete approval.', 409)
  }
  try {
    await req.payload.create({
      collection: 'assistant-delete-receipts',
      data: { nonce: grant.nonce },
      overrideAccess: true,
    })
  } catch {
    throw new APIError('The approval was already used or could not be recorded.', 409)
  }
  const result = await req.payload.delete({
    collection: grant.collection,
    where: {
      id: { equals: grant.id },
      tenant: { equals: tenant },
      updatedAt: { equals: grant.updatedAt },
    },
    overrideAccess: false,
    req,
  })
  if (result.docs.length !== 1 || result.errors.length) {
    throw new APIError(
      'The document could not be deleted. Check your permissions and try again.',
      403,
    )
  }
  return { deleted: true }
}
