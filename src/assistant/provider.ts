import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { ModelProvider } from './protocol'
import { fetchPublicHTTPS, publicHTTPSURL } from './outbound'

export function compatibleURL(value: string) {
  const url = publicHTTPSURL(value)
  if (url.search) throw new Error('Enter a provider base URL without a query string.')
  return url
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
