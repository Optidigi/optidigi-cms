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
  | { type: 'draft-saved'; id: number; locale: 'nl' | 'en'; preview: string | null }

export type Connection = {
  provider: ModelProvider
  model: string
  baseURL?: string | null
}

export const contextCollections = ['pages', 'articles', 'projects', 'site-settings'] as const

export const responseDetail = ['brief', 'standard', 'detailed'] as const
export type ResponseDetail = (typeof responseDetail)[number]
