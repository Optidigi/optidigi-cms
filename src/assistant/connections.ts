import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogle } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createGateway } from 'ai'
import { createHash } from 'node:crypto'
import { APIError, type Endpoint, type PayloadRequest } from 'payload'
import { z } from 'zod'
import type { AssistantSetting } from '../payload-types'
import { isPlatformAdmin } from '../site/access'
import type { AssistantProvider } from './collections'

type Connection = NonNullable<AssistantSetting['connections']>[number]
export type ModelChoice = { connection: string; model: string }

// The settings of one website, read with the user's own access (the multi-tenant plugin scopes it).
export async function settingsFor(req: PayloadRequest, site: number) {
  const { docs: [settings] } = await req.payload.find({
    collection: 'assistant-settings', depth: 0, limit: 1, overrideAccess: false, req,
    where: { tenant: { equals: site } },
  })
  return settings
}

// Every enabled `connection:model` pair of a website, in order.
export function enabledModels(settings: AssistantSetting | undefined): ModelChoice[] {
  return (settings?.connections ?? []).flatMap((connection) =>
    connection.id && connection.hasKey ? (connection.models ?? []).map((model) => ({ connection: connection.id!, model })) : [],
  )
}

export const choiceKey = ({ connection, model }: ModelChoice) => `${connection}:${model}`

// The requested model when it is enabled, otherwise the website's default, otherwise the first one.
export function pickModel(settings: AssistantSetting | undefined, requested?: string) {
  const choices = enabledModels(settings)
  return (
    choices.find((choice) => choiceKey(choice) === requested) ??
    choices.find((choice) => choiceKey(choice) === settings?.defaultModel) ??
    choices[0]
  )
}

// The connection with its decrypted key. The key is unreadable through access control; it's read
// as trusted server work after the caller checked the user's access to the website.
export async function connectionWithKey(req: PayloadRequest, settings: AssistantSetting, id: string) {
  const connection = settings.connections?.find((candidate) => candidate.id === id)
  if (!connection) throw new APIError('This AI connection no longer exists.', 409, undefined, true)
  const stored = await req.payload.findByID({
    collection: 'assistant-settings', id: settings.id, depth: 0, overrideAccess: true, select: { connections: true },
  })
  const apiKey = stored.connections?.find((candidate) => candidate.id === id)?.apiKey
  if (!apiKey) throw new APIError('This AI connection has no API key.', 409, undefined, true)
  return { ...connection, apiKey: req.payload.decrypt(apiKey), storedKey: apiKey }
}

type Keyed = Connection & { apiKey: string }

export function languageModel({ provider, apiKey, baseURL }: Keyed, model: string) {
  const options = { apiKey, ...(baseURL ? { baseURL } : {}) }
  switch (provider as AssistantProvider) {
    case 'openai':
      return createOpenAI(options)(model)
    case 'google':
      return createGoogle(options)(model)
    case 'mistral':
      return createMistral(options)(model)
    case 'gateway':
      return createGateway(options)(model)
    case 'openai-compatible':
      if (!baseURL) throw new APIError('This AI connection has no base URL.', 409, undefined, true)
      return createOpenAICompatible({ name: 'connection', apiKey, baseURL })(model)
    default:
      return createAnthropic(options)(model)
  }
}

export type ListedModel = { id: string; name: string; tools?: boolean }

const defaults: Record<AssistantProvider, string | undefined> = {
  anthropic: 'https://api.anthropic.com/v1',
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  mistral: 'https://api.mistral.ai/v1',
  gateway: 'https://ai-gateway.vercel.sh/v1',
  'openai-compatible': undefined,
}

// OpenAI lists every model it has; keep the chat models.
const openAIChat = /^(gpt-|o\d|chatgpt-)/
const openAISkip = /(audio|realtime|tts|transcribe|image|search|embedding|instruct|moderation)/

async function getJSON(url: string, headers: Record<string, string>) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(`Model list request failed with ${response.status}`)
  return (await response.json()) as Record<string, unknown>
}

const list = (value: unknown) => (Array.isArray(value) ? (value as Record<string, unknown>[]) : [])
const text = (value: unknown) => (typeof value === 'string' ? value : undefined)

// Reads the provider's official model list and keeps the models that can chat. `tools` is true or
// false when the provider says whether a model can use tools, and absent when it doesn't say.
export async function listModels({ provider, apiKey, baseURL }: Keyed): Promise<ListedModel[]> {
  const base = (baseURL || defaults[provider as AssistantProvider] || '').replace(/\/+$/, '')
  if (!base) throw new APIError('This AI connection has no base URL.', 409, undefined, true)
  const bearer = { Authorization: `Bearer ${apiKey}` }
  switch (provider as AssistantProvider) {
    case 'anthropic': {
      const body = await getJSON(`${base}/models?limit=1000`, { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' })
      return list(body.data).map((model) => ({ id: String(model.id), name: text(model.display_name) ?? String(model.id), tools: true }))
    }
    case 'google': {
      const body = await getJSON(`${base}/models?pageSize=1000`, { 'x-goog-api-key': apiKey })
      return list(body.models)
        .filter((model) => list(model.supportedGenerationMethods).length === 0 || (model.supportedGenerationMethods as string[]).includes('generateContent'))
        .map((model) => {
          const id = String(model.name).replace(/^models\//, '')
          return { id, name: text(model.displayName) ?? id }
        })
        .filter(({ id }) => !/(embedding|imagen|aqa|tts|image)/.test(id))
    }
    case 'mistral': {
      const body = await getJSON(`${base}/models`, bearer)
      return list(body.data)
        .filter((model) => (model.capabilities as { completion_chat?: boolean } | undefined)?.completion_chat !== false)
        .map((model) => ({
          id: String(model.id),
          name: text(model.name) ?? String(model.id),
          tools: (model.capabilities as { function_calling?: boolean } | undefined)?.function_calling,
        }))
    }
    case 'gateway': {
      const body = await getJSON(`${base}/models`, bearer)
      return list(body.data)
        .filter((model) => model.type === undefined || model.type === 'language')
        .map((model) => ({
          id: String(model.id),
          name: text(model.name) ?? String(model.id),
          tools: Array.isArray(model.tags) ? (model.tags as string[]).includes('tool-use') : undefined,
        }))
    }
    case 'openai': {
      const body = await getJSON(`${base}/models`, bearer)
      return list(body.data)
        .map((model) => String(model.id))
        .filter((id) => openAIChat.test(id) && !openAISkip.test(id))
        .map((id) => ({ id, name: id }))
    }
    default: {
      // OpenAI-compatible endpoints (OpenRouter, self-hosted); OpenRouter also says which support tools.
      const body = await getJSON(`${base}/models`, bearer)
      return list(body.data).map((model) => ({
        id: String(model.id),
        name: text(model.name) ?? String(model.id),
        tools: Array.isArray(model.supported_parameters) ? (model.supported_parameters as string[]).includes('tools') : undefined,
      }))
    }
  }
}

// Model lists change rarely; keep them for an hour per connection and key.
const cache = new Map<string, { expires: number; models: ListedModel[] }>()
const hour = 60 * 60_000

const modelsBody = z.object({ site: z.number().int().positive(), connection: z.string().min(1).max(100) })

function json(value: unknown, status: number) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
}

// POST /api/assistant/models { site, connection }: the chat models a saved connection offers.
// Platform administrators only; the key stays on the server.
async function models(req: PayloadRequest): Promise<Response> {
  const user = req.user
  if (user?.collection !== 'users') return json({ error: 'Unauthorized' }, 401)
  if (!isPlatformAdmin(user)) return json({ error: 'Forbidden' }, 403)
  const input = modelsBody.safeParse(await req.json?.())
  if (!input.success) return json({ error: 'Invalid request' }, 400)
  const { site, connection: id } = input.data
  try {
    const settings = await settingsFor(req, site)
    if (!settings) return json({ error: 'AI is not set up for this website.' }, 409)
    const connection = await connectionWithKey(req, settings, id)
    const key = createHash('sha256').update(`${settings.id}:${id}:${connection.provider}:${connection.baseURL}:${connection.storedKey}`).digest('hex')
    const cached = cache.get(key)
    if (cached && cached.expires > Date.now()) return json({ models: cached.models }, 200)
    const found = (await listModels(connection)).sort((a, b) => a.id.localeCompare(b.id))
    cache.set(key, { expires: Date.now() + hour, models: found })
    return json({ models: found }, 200)
  } catch (error) {
    if (error instanceof APIError && error.isPublic) return json({ error: error.message }, error.status)
    // Never return the provider's raw answer; it can echo request data.
    req.payload.logger.warn({ err: error, msg: 'Listing AI models failed' })
    return json({ error: 'The provider refused the key or could not be reached.' }, 502)
  }
}

export const modelEndpoints: Endpoint[] = [{ path: '/assistant/models', method: 'post', handler: models }]
