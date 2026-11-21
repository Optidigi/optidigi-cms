import { APIError, type CollectionConfig, type PayloadRequest, type Where } from 'payload'
import { relationID } from '../site/access'

// The AI endpoint calls Payload's own MCP server as the signed-in user and names the chat's website
// in this header. The header can only narrow what the user may already access, never widen it.
export const assistantSiteHeader = 'x-cms-assistant-site'

export function assistantSite(req: PayloadRequest): number | undefined {
  const value = req.headers?.get(assistantSiteHeader)
  if (value === null || value === undefined) return undefined
  const site = relationID(value)
  if (!site) throw new APIError('Invalid assistant website.', 403)
  return site
}

// Multi-tenant plugin hook: limit every read, update and delete of an AI request to its website.
export function limitToAssistantSite({
  accessKey,
  accessResult,
  req,
}: {
  accessKey: string
  accessResult: boolean | Where
  req: PayloadRequest
}): boolean | Where {
  const site = assistantSite(req)
  if (site === undefined || !accessResult || accessKey === 'create') return accessResult
  const field = accessKey === 'readVersions' ? 'version.tenant' : 'tenant'
  const scoped: Where = { [field]: { equals: site } }
  return accessResult === true ? scoped : { and: [accessResult, scoped] }
}

// Creates and tenant changes from an AI request must stay on the chat's website.
export function keepAssistantWritesOnSite(collection: CollectionConfig): CollectionConfig {
  return {
    ...collection,
    hooks: {
      ...collection.hooks,
      beforeValidate: [
        ({ data, operation, req }) => {
          const site = assistantSite(req)
          if (!data || site === undefined) return data
          if (data.tenant != null && relationID(data.tenant) !== site) {
            throw new APIError('The assistant can only change the website of this chat.', 403)
          }
          return operation === 'create' ? { ...data, tenant: site } : data
        },
        ...(collection.hooks?.beforeValidate ?? []),
      ],
    },
  }
}
