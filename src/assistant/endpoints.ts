import { APIError, z, type Endpoint, type PayloadRequest } from 'payload'
import { confirmDelete } from './approval'
import { streamAssistant } from './chat'
import { encryptCredential } from './credentials'
import { contextCollections, modelProviders, responseDetail, type Connection } from './protocol'
import { compatibleURL } from './provider'
import { assistantMemberships } from './scope'

const credentials = 'assistant-credentials'
const tenant = z.number().check(z.int(), z.positive())
const action = z.discriminatedUnion('action', [
  z.object({ action: z.literal('status'), tenant }),
  z.object({ action: z.literal('disconnect'), tenant }),
  z.object({
    action: z.literal('connect'),
    tenant,
    provider: z.enum(modelProviders),
    model: z.string().check(z.trim(), z.minLength(1), z.maxLength(150)),
    apiKey: z.string().check(z.trim(), z.minLength(1), z.maxLength(4096)),
    baseURL: z.optional(z.string().check(z.trim(), z.maxLength(1024))),
  }),
  z.object({
    action: z.literal('chat'),
    tenant,
    detail: z.optional(z.enum(responseDetail)),
    context: z.optional(z.object({ collection: z.enum(contextCollections), id: tenant })),
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().check(z.minLength(1), z.maxLength(6000)),
        }),
      )
      .check(z.minLength(1), z.maxLength(24)),
  }),
  z.object({
    action: z.literal('approve'),
    tenant,
    token: z.string().check(z.minLength(1), z.maxLength(2048)),
  }),
])

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function readAssistantRequest(req: PayloadRequest) {
  if (!req.headers.get('content-type')?.startsWith('application/json') || !req.body) return null
  const reader = req.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let size = 0
  let input = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 1024 * 1024) {
        await reader.cancel()
        return null
      }
      input += decoder.decode(value, { stream: true })
    }
    const parsed = action.safeParse(JSON.parse(input + decoder.decode()))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }
}

async function handleAssistant(req: PayloadRequest) {
  if (!req.user) return json({ error: 'Sign in to use the assistant.' }, 401)
  const origin = process.env.PUBLIC_SERVER_URL || req.payload.config.serverURL
  if (!origin || req.headers.get('origin') !== origin) {
    return json({ error: 'Invalid assistant request origin.' }, 403)
  }

  const input = await readAssistantRequest(req)
  if (!input) return json({ error: 'Invalid assistant request.' }, 400)
  const membership = assistantMemberships(req.user).find(({ id }) => id === input.tenant)
  if (!membership) return json({ error: 'You do not have access to this tenant.' }, 403)
  try {
    if (input.action === 'approve') {
      if (!membership.canManage)
        return json({ error: 'Only tenant admins can approve a delete.' }, 403)
      return json(await confirmDelete(req, input.tenant, input.token))
    }
    const needsManagement = input.action === 'connect' || input.action === 'disconnect'
    if (needsManagement && !membership.canManage) {
      return json({ error: 'Only tenant admins can manage the model connection.' }, 403)
    }

    // This private collection is read only after explicit tenant and role checks above.
    // Prefer a narrow selection and never return the credential record itself.
    const current = await req.payload.find({
      collection: credentials,
      depth: 0,
      limit: 1,
      overrideAccess: true,
      select: {
        provider: true,
        model: true,
        baseURL: true,
        ciphertext: input.action === 'chat' ? true : undefined,
      },
      where: { tenant: { equals: input.tenant } },
    })
    const connection = current.docs[0] as
      | (Connection & { id: number; ciphertext?: string })
      | undefined

    if (input.action === 'status') {
      return json({
        connected: Boolean(connection),
        ...(connection && { model: connection.model }),
        ...(connection && membership.canManage
          ? {
              settings: {
                provider: connection.provider,
                model: connection.model,
                baseURL: connection.baseURL,
              },
            }
          : {}),
      })
    }
    if (input.action === 'disconnect') {
      if (connection)
        await req.payload.delete({
          collection: credentials,
          id: connection.id,
          overrideAccess: true,
        })
      return json({ connected: false })
    }
    if (input.action === 'connect') {
      let baseURL: string | null = null
      if (input.provider === 'openai-compatible') {
        try {
          baseURL = compatibleURL(input.baseURL ?? '').href
        } catch {
          return json({ error: 'Enter the HTTPS base URL of a public model provider.' }, 400)
        }
      }
      const data = {
        provider: input.provider,
        model: input.model,
        baseURL,
        ciphertext: await encryptCredential(input.apiKey, input.tenant),
      }
      if (connection) {
        await req.payload.update({
          collection: credentials,
          id: connection.id,
          data,
          overrideAccess: true,
        })
      } else {
        await req.payload.create({
          collection: credentials,
          data: { ...data, tenant: input.tenant },
          overrideAccess: true,
        })
      }
      return json({
        connected: true,
        settings: { provider: input.provider, model: input.model, baseURL },
      })
    }
    if (!connection?.ciphertext)
      return json({ error: 'Connect a model before using the assistant.' }, 409)
    if (input.messages[0]?.role !== 'user' || input.messages.at(-1)?.role !== 'user') {
      return json({ error: 'The conversation must begin and end with a user message.' }, 400)
    }
    const context = input.context
    let document: { collection: string; id: number; title: string } | undefined
    if (context) {
      const {
        docs: [record],
      } = await req.payload.find({
        collection: context.collection,
        where: { id: { equals: context.id }, tenant: { equals: input.tenant } },
        limit: 1,
        depth: 0,
        draft: true,
        overrideAccess: false,
        req,
      })
      if (!record)
        return json({ error: 'The current document is unavailable in this tenant.' }, 404)
      document = {
        ...context,
        title: ('title' in record ? record.title : record.name)?.slice(0, 200) ?? '',
      }
    }
    return await streamAssistant({
      document,
      detail: input.detail ?? 'standard',
      canDelete: membership.canManage,
      connection: { ...connection, ciphertext: connection.ciphertext },
      messages: input.messages,
      origin,
      req,
      tenant: input.tenant,
    })
  } catch (error) {
    // Never return or log raw provider and connection errors, which can carry request data.
    if (input.action === 'approve' && error instanceof APIError && error.status < 500) {
      return json({ error: error.message }, error.status)
    }
    return json({ error: 'The assistant could not complete the request.' }, 500)
  }
}

export const assistantEndpoints: Endpoint[] = [
  {
    path: '/assistant',
    method: 'post',
    handler: handleAssistant,
  },
]
