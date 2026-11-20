import { convertToModelMessages, generateText } from 'ai'
import { APIError, type Endpoint, type PayloadRequest } from 'payload'
import { z } from 'zod'
import { confirmDelete } from './approval'
import { prepareModelHistory, prepareUserMessage } from './attachments'
import { streamAssistant, streamThread } from './chat'
import { decryptCredential, encryptCredential } from './credentials'
import {
  contextCollections,
  modelProviders,
  reasoningEfforts,
  responseDetail,
  type Connection,
} from './protocol'
import { catalogOptions, resolveCatalog } from './model-catalog'
import { compatibleURL, modelCapabilities, providerModel } from './provider'
import { assistantMemberships } from './scope'
import {
  assertNewMessage,
  createThread,
  deleteThread,
  findThread,
  holdThread,
  initialThreadTitle,
  listThreads,
  readThread,
  recentThreadMessages,
  saveThreadMessage,
  updateThread,
} from './threads'

const credentials = 'assistant-credentials'
const tenant = z.number().check(z.int(), z.positive())
const thread = tenant
const contextSchema = z.optional(z.object({ collection: z.enum(contextCollections), id: tenant }))
const action = z.discriminatedUnion('action', [
  z.object({ action: z.literal('status'), tenant }),
  z.object({ action: z.literal('disconnect'), tenant }),
  z.object({ action: z.literal('test-connection'), tenant }),
  z.object({ action: z.literal('configure-models'), tenant, options: catalogOptions }),
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
    locale: z.optional(z.enum(['nl', 'en'])),
    context: contextSchema,
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
    action: z.literal('chat-v2'),
    tenant,
    modelID: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    retryMessageID: z.string().min(1).max(150).optional(),
    thread,
    detail: z.optional(z.enum(responseDetail)),
    effort: z.optional(z.enum(reasoningEfforts)),
    locale: z.optional(z.enum(['nl', 'en'])),
    context: contextSchema,
    messages: z.array(z.unknown()).max(2000),
  }),
  z.object({
    action: z.literal('thread-list'),
    tenant,
    query: z.string().trim().max(120).optional(),
    archived: z.boolean().optional(),
    page: z.number().int().positive().max(1000).optional(),
  }),
  z.object({ action: z.literal('thread-create'), tenant }),
  z.object({ action: z.literal('thread-read'), tenant, thread }),
  z.object({
    action: z.literal('thread-update'),
    tenant,
    thread,
    title: z.string().trim().min(1).max(120).optional(),
    archived: z.boolean().optional(),
  }),
  z.object({ action: z.literal('thread-delete'), tenant, thread }),
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
    switch (input.action) {
      case 'thread-list':
        return json(await listThreads(req, input.tenant, input))
      case 'thread-create':
        return json(await createThread(req, input.tenant), 201)
      case 'thread-read':
        return json(await readThread(req, input.tenant, input.thread))
      case 'thread-update':
        if (input.title === undefined && input.archived === undefined) {
          return json({ error: 'Provide a title or archived state.' }, 400)
        }
        return json(
          await updateThread(req, input.tenant, input.thread, {
            ...(input.title !== undefined && { title: input.title }),
            ...(input.archived !== undefined && { archived: input.archived }),
          }),
        )
      case 'thread-delete':
        return json(await deleteThread(req, input.tenant, input.thread))
    }
    if (input.action === 'approve') {
      if (!membership.canManage)
        return json({ error: 'Only tenant admins can approve a delete.' }, 403)
      return json(await confirmDelete(req, input.tenant, input.token))
    }
    const needsManagement =
      input.action === 'connect' ||
      input.action === 'disconnect' ||
      input.action === 'configure-models' ||
      input.action === 'test-connection'
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
        catalog: true,
        ciphertext:
          input.action === 'chat' ||
          input.action === 'chat-v2' ||
          input.action === 'test-connection'
            ? true
            : undefined,
      },
      where: { tenant: { equals: input.tenant } },
    })
    const connection = current.docs[0] as
      | (Connection & { id: number; ciphertext?: string; catalog?: unknown })
      | undefined

    const catalog = connection && resolveCatalog(input.tenant, connection, connection.catalog)
    if (input.action === 'status') {
      return json({
        connected: Boolean(connection),
        ...(catalog && {
          model: catalog.fallback.model,
          capabilities: catalog.fallback.capabilities,
          models: catalog.models.map(({ id, label, capabilities }) => ({
            id,
            label,
            capabilities,
          })),
          defaultModelID: catalog.fallback.id,
          defaultDetail: catalog.detail,
        }),
        ...(connection &&
          membership.canManage && {
            settings: {
              provider: connection.provider,
              model: connection.model,
              baseURL: connection.baseURL,
              catalog: catalog?.options,
            },
          }),
      })
    }
    if (input.action === 'configure-models') {
      if (!connection) return json({ error: 'Connect a provider before adding models.' }, 409)
      const options = input.options
      if (
        options.models.some(({ model }) => model === connection.model) ||
        (options.defaultModel &&
          options.defaultModel !== connection.model &&
          !options.models.some(({ model }) => model === options.defaultModel))
      )
        return json({ error: 'Select a default from the models configured for this tenant.' }, 400)
      await req.payload.update({
        collection: credentials,
        id: connection.id,
        overrideAccess: true,
        data: { catalog: options },
      })
      return json({ ok: true })
    }
    if (input.action === 'test-connection') {
      if (!connection?.ciphertext || !catalog)
        return json({ error: 'Connect a model before testing.' }, 409)
      try {
        const key = await decryptCredential(connection.ciphertext, input.tenant)
        await generateText({
          model: providerModel(
            connection.provider,
            catalog.fallback.model,
            key,
            connection.baseURL,
          ),
          prompt: 'Reply with OK.',
          maxOutputTokens: 64,
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(15_000),
        })
        return json({ ok: true })
      } catch {
        return json({ error: 'The model connection test failed.' }, 502)
      }
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
          data: {
            ...data,
            ...(connection.provider !== data.provider || (connection.baseURL ?? null) !== baseURL
              ? { catalog: null }
              : {}),
          },
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
        model: input.model,
        capabilities: modelCapabilities(input.provider, input.model),
        settings: { provider: input.provider, model: input.model, baseURL },
      })
    }
    if (!connection?.ciphertext)
      return json({ error: 'Connect a model before using the assistant.' }, 409)
    const modelID = input.action === 'chat-v2' ? input.modelID : undefined
    const selected = modelID ? catalog?.models.find(({ id }) => id === modelID) : catalog?.fallback
    if (!selected) return json({ error: 'The selected model is unavailable for this tenant.' }, 400)
    const context = input.context
    let document: { collection: string; id: number; title: string; homepage: boolean } | undefined
    if (context) {
      const {
        docs: [record],
      } = await req.payload.find({
        collection: context.collection,
        where: { id: { equals: context.id }, tenant: { equals: input.tenant } },
        limit: 1,
        depth: 0,
        draft: true,
        locale: input.locale,
        overrideAccess: false,
        req,
      })
      if (!record)
        return json({ error: 'The current document is unavailable in this tenant.' }, 404)
      document = {
        ...context,
        homepage: context.collection === 'pages' && 'slug' in record && record.slug === 'home',
        title: ('title' in record ? record.title : record.name)?.slice(0, 200) ?? '',
      }
    }
    const run = {
      document,
      locale: input.locale ?? ('nl' as const),
      detail: input.detail ?? catalog?.detail ?? ('standard' as const),
      canDelete: membership.canManage,
      connection: {
        ...connection,
        model: input.action === 'chat-v2' ? selected.model : connection.model,
        ciphertext: connection.ciphertext,
      },
      origin,
      req,
      tenant: input.tenant,
    }

    if (input.action !== 'chat-v2') {
      if (input.messages[0]?.role !== 'user' || input.messages.at(-1)?.role !== 'user') {
        return json({ error: 'The conversation must begin and end with a user message.' }, 400)
      }
      return await streamAssistant({ ...run, messages: input.messages })
    }

    const { capabilities } = selected
    if (input.effort && !capabilities.efforts.includes(input.effort)) {
      return json({ error: 'This model does not support the requested reasoning effort.' }, 400)
    }
    await findThread(req, input.tenant, input.thread)
    const release = holdThread(input.thread)
    try {
      const record = await findThread(req, input.tenant, input.thread)
      if (record.archived)
        throw new APIError('Reopen the conversation before sending a message.', 409)
      const history = await recentThreadMessages(req, record.id)
      if (input.retryMessageID) {
        const last = history.at(-1)
        if (last?.role !== 'user' || last.id !== input.retryMessageID) {
          throw new APIError('Only the latest unanswered message can be retried.', 409)
        }
        const previous = await prepareModelHistory(req, history.slice(0, -1), {
          origin,
          tenant: input.tenant,
          thread: record.id,
          allowed: capabilities.attachmentTypes,
        })
        const retry = await prepareUserMessage(req, {
          origin,
          tenant: input.tenant,
          thread: record.id,
          allowed: capabilities.attachmentTypes,
          input: last,
        })
        const messages = await convertToModelMessages([...previous, retry.model])
        return streamThread(
          { ...run, messages, effort: input.effort, withoutTools: true },
          (message) => saveThreadMessage(req, record.id, message),
          release,
        )
      }
      const prepared = await prepareUserMessage(req, {
        origin,
        tenant: input.tenant,
        thread: record.id,
        input: input.messages.at(-1),
        allowed: capabilities.attachmentTypes,
      })
      await assertNewMessage(req, record.id, prepared.stored.id)
      const modelHistory = await prepareModelHistory(req, history, {
        origin,
        tenant: input.tenant,
        thread: record.id,
        allowed: capabilities.attachmentTypes,
      })
      const messages = await convertToModelMessages([...modelHistory, prepared.model])
      await saveThreadMessage(
        req,
        record.id,
        prepared.stored,
        initialThreadTitle(record.title, history.length === 0, prepared.stored),
      )
      return streamThread(
        { ...run, messages, effort: input.effort },
        (message) => saveThreadMessage(req, record.id, message),
        release,
      )
    } catch (error) {
      release()
      throw error
    }
  } catch (error) {
    // Never return or log raw provider and connection errors, which can carry request data.
    if (error instanceof APIError && error.status < 500 && error.isPublic) {
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
