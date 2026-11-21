import type { MessageKey } from '../i18n'

export type Provider = 'anthropic' | 'openai' | 'google' | 'mistral' | 'gateway' | 'openai-compatible'

export type ServiceGroup = 'direct' | 'many' | 'other' | 'custom'

// A service people can pick in the AI settings. Services without their own provider are stored as
// `openai-compatible` with a fixed base URL, and are recognised again by that URL.
export type Service = {
  id: string
  name: string
  group: ServiceGroup
  provider: Provider
  description: MessageKey
  // Fixed address of an OpenAI-compatible service.
  baseURL?: string
  // Where to create an API key.
  keyURL?: string
  // Whether the service's model list says which models can use tools.
  reportsTools: boolean
}

export const services: Service[] = [
  { id: 'anthropic', name: 'Anthropic (Claude)', group: 'direct', provider: 'anthropic', description: 'serviceAnthropic', keyURL: 'https://platform.claude.com/settings/keys', reportsTools: true },
  { id: 'openai', name: 'OpenAI (GPT)', group: 'direct', provider: 'openai', description: 'serviceOpenAI', keyURL: 'https://platform.openai.com/api-keys', reportsTools: false },
  { id: 'google', name: 'Google (Gemini)', group: 'direct', provider: 'google', description: 'serviceGoogle', keyURL: 'https://aistudio.google.com/apikey', reportsTools: false },
  { id: 'mistral', name: 'Mistral', group: 'direct', provider: 'mistral', description: 'serviceMistral', keyURL: 'https://console.mistral.ai/api-keys', reportsTools: true },
  { id: 'gateway', name: 'Vercel AI Gateway', group: 'many', provider: 'gateway', description: 'serviceGateway', keyURL: 'https://vercel.com/docs/ai-gateway/authentication-and-byok', reportsTools: true },
  { id: 'openrouter', name: 'OpenRouter', group: 'many', provider: 'openai-compatible', description: 'serviceOpenRouter', baseURL: 'https://openrouter.ai/api/v1', keyURL: 'https://openrouter.ai/settings/keys', reportsTools: true },
  { id: 'xai', name: 'xAI (Grok)', group: 'other', provider: 'openai-compatible', description: 'serviceXAI', baseURL: 'https://api.x.ai/v1', keyURL: 'https://console.x.ai', reportsTools: false },
  { id: 'deepseek', name: 'DeepSeek', group: 'other', provider: 'openai-compatible', description: 'serviceDeepSeek', baseURL: 'https://api.deepseek.com/v1', keyURL: 'https://platform.deepseek.com/api_keys', reportsTools: false },
  { id: 'groq', name: 'Groq', group: 'other', provider: 'openai-compatible', description: 'serviceGroq', baseURL: 'https://api.groq.com/openai/v1', keyURL: 'https://console.groq.com/keys', reportsTools: false },
  { id: 'together', name: 'Together AI', group: 'other', provider: 'openai-compatible', description: 'serviceTogether', baseURL: 'https://api.together.xyz/v1', keyURL: 'https://api.together.ai/settings/api-keys', reportsTools: false },
  { id: 'fireworks', name: 'Fireworks', group: 'other', provider: 'openai-compatible', description: 'serviceFireworks', baseURL: 'https://api.fireworks.ai/inference/v1', keyURL: 'https://app.fireworks.ai/settings/users/api-keys', reportsTools: false },
  { id: 'cerebras', name: 'Cerebras', group: 'other', provider: 'openai-compatible', description: 'serviceCerebras', baseURL: 'https://api.cerebras.ai/v1', keyURL: 'https://cloud.cerebras.ai', reportsTools: false },
  { id: 'custom', name: '', group: 'custom', provider: 'openai-compatible', description: 'serviceCustom', reportsTools: false },
]

export const serviceGroups: { group: ServiceGroup; label: MessageKey }[] = [
  { group: 'direct', label: 'servicesDirect' },
  { group: 'many', label: 'servicesMany' },
  { group: 'other', label: 'servicesOther' },
  { group: 'custom', label: 'servicesCustom' },
]

const normalize = (url: string) => url.trim().replace(/\/+$/, '').toLowerCase()

export const serviceByID = (id: string) => services.find((service) => service.id === id) ?? services[0]

// The service a stored connection belongs to: its own provider, or the OpenAI-compatible service
// with the same address, otherwise a custom service.
export function serviceOf(provider: Provider, baseURL: string): Service {
  if (provider !== 'openai-compatible') return services.find((service) => service.provider === provider) ?? services[0]
  const address = normalize(baseURL)
  return services.find((service) => service.baseURL && normalize(service.baseURL) === address) ?? serviceByID('custom')
}
