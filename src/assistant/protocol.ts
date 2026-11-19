export const modelProviders = ['anthropic', 'openai', 'openai-compatible'] as const
export type ModelProvider = (typeof modelProviders)[number]

export type AssistantMessage = { role: 'user' | 'assistant'; content: string }

export type Approval = {
  collection: string
  id: number
  label: string
  token: string
}

export type AssistantEvent =
  | { type: 'text'; text: string }
  | { type: 'approval'; approval: Approval }
  | { type: 'error'; message: string }

export type Connection = {
  provider: ModelProvider
  model: string
  baseURL?: string | null
}
