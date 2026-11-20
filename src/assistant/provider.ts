import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { streamText } from 'ai'
import { assistantUploadTypes } from './collections'
import { reasoningEfforts, type ModelProvider, type ReasoningEffort } from './protocol'
import { fetchPublicHTTPS, publicHTTPSURL } from './outbound'

export function compatibleURL(value: string) {
  const url = publicHTTPSURL(value)
  if (url.search) throw new Error('Enter a provider base URL without a query string.')
  return url
}

export function modelCapabilities(provider: ModelProvider, model: string) {
  const openAIReasoning =
    provider === 'openai' &&
    /^(gpt-5(?:\.[12456]|-(?:mini|nano)|\.(?:4|6)-(?:mini|nano))?|gpt-6(?:\.[12])?-(?:astra|sol|luna)|o3|o4-mini)(?:-\d{4}-\d{2}-\d{2})?$/.test(
      model,
    )
  const anthropicReasoning =
    provider === 'anthropic' &&
    /^claude-(?:opus-(?:4-[5-8]|5(?:-5)?)|sonnet-(?:4-6|5(?:-5)?)|haiku-5-5|(?:fable|mythos)-5(?:-[12])?)(?:-\d{8})?$/.test(
      model,
    )
  const canReadFiles =
    (provider === 'openai' && /^(gpt-4[.o]|gpt-[56](?:[.\-]|$)|o[34](?:-|$))/.test(model)) ||
    (provider === 'anthropic' && /^claude-(?:3|opus|sonnet|haiku|fable|mythos)(?:-|$)/.test(model))

  return {
    efforts: openAIReasoning || anthropicReasoning ? [...reasoningEfforts] : [],
    attachmentTypes: canReadFiles ? [...assistantUploadTypes] : ['text/plain'],
  }
}

export function modelReasoningOptions(
  provider: ModelProvider,
  effort?: ReasoningEffort,
): Parameters<typeof streamText>[0]['providerOptions'] {
  if (!effort) return undefined
  if (provider === 'openai') return { openai: { reasoningEffort: effort } }
  if (provider === 'anthropic') return { anthropic: { effort } }
  return undefined
}

export function providerModel(
  provider: ModelProvider,
  model: string,
  apiKey: string,
  baseURL?: string | null,
) {
  if (provider === 'anthropic') return createAnthropic({ apiKey })(model)
  if (provider === 'openai') return createOpenAI({ apiKey })(model)

  const base = compatibleURL(baseURL ?? '')
  return createOpenAICompatible({
    name: 'customer-provider',
    apiKey,
    baseURL: base.href.replace(/\/$/, ''),
    fetch: async (input, init) => {
      const request = new Request(input, init)
      if (new URL(request.url).origin !== base.origin) {
        throw new Error('Provider destination is unavailable.')
      }
      return fetchPublicHTTPS(request)
    },
  })(model)
}
