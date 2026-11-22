import { getAnthropicLanguageModelEntry } from '@ai-sdk/anthropic/internal'
import { getGoogleLanguageModelEntry } from '@ai-sdk/google/internal'
import { openaiModelCatalog } from '@ai-sdk/openai/internal'
import type { AssistantProvider } from './collections'
import { effortLevels, type EffortLevel, type ModelCapabilities } from './efforts'

export { effortLevels, type EffortLevel, type ModelCapabilities }

// What a provider's own model list says about a model, where it says anything.
export type ListedCapabilities = { efforts?: EffortLevel[]; thinking?: boolean; images?: boolean; pdfs?: boolean }

const known = (values: readonly unknown[]) => effortLevels.filter((level) => values.includes(level))
const flag = (value: unknown) => (typeof value === 'boolean' ? value : null)
const budgetLevels: EffortLevel[] = ['low', 'medium', 'high']

// Anthropic's model list: `capabilities.effort`, `thinking` and `image_input`/`pdf_input`.
// https://platform.claude.com/docs/en/api/models/list
export function anthropicListed(capabilities: unknown): ListedCapabilities {
  if (!capabilities || typeof capabilities !== 'object') return {}
  type Support = { supported?: boolean } | null | undefined
  const caps = capabilities as {
    effort?: Record<string, Support> & { supported?: boolean }
    thinking?: { supported?: boolean; types?: Record<string, Support> }
    image_input?: Support
    pdf_input?: Support
  }
  let efforts: EffortLevel[] | undefined
  if (caps.thinking?.supported === false) efforts = []
  else if (caps.effort?.supported) efforts = known(Object.keys(caps.effort).filter((level) => caps.effort?.[level]?.supported === true))
  // Thinking with a token budget only: the AI SDK turns low/medium/high into budgets.
  else if (caps.thinking?.types?.enabled?.supported) efforts = budgetLevels
  if (efforts?.length && caps.thinking?.types?.disabled?.supported) efforts = ['none', ...efforts]
  return {
    ...(efforts ? { efforts } : {}),
    ...(typeof caps.image_input?.supported === 'boolean' ? { images: caps.image_input.supported } : {}),
    ...(typeof caps.pdf_input?.supported === 'boolean' ? { pdfs: caps.pdf_input.supported } : {}),
  }
}

// OpenRouter's model list: `reasoning.supported_efforts` and `architecture.input_modalities`.
// https://openrouter.ai/docs/api-reference/models/get-models
export function openRouterListed(model: Record<string, unknown>): ListedCapabilities {
  const reasoning = model.reasoning as { supported_efforts?: unknown } | undefined
  const parameters = Array.isArray(model.supported_parameters) ? (model.supported_parameters as string[]) : undefined
  const inputs = (model.architecture as { input_modalities?: unknown } | undefined)?.input_modalities
  let efforts: EffortLevel[] | undefined
  if (Array.isArray(reasoning?.supported_efforts)) efforts = known(reasoning.supported_efforts)
  else if (parameters && !parameters.includes('reasoning') && !parameters.includes('reasoning_effort')) efforts = []
  return {
    ...(efforts ? { efforts } : {}),
    ...(Array.isArray(inputs) ? { images: inputs.includes('image'), pdfs: inputs.includes('file') } : {}),
  }
}

// The AI SDK's own table of the model, for what the provider's list doesn't say.
function fromCatalog(provider: AssistantProvider, model: string): Partial<ModelCapabilities> {
  if (provider === 'openai') {
    const entry = openaiModelCatalog[model] ?? openaiModelCatalog[model.replace(/-\d{4}-\d{2}-\d{2}$/, '')]
    const language = entry?.capabilities.language
    if (!language) return {}
    const images = flag(language.inputs.image)
    const reasoning = language.reasoning as { support?: unknown; efforts?: readonly string[] }
    return { efforts: reasoning.support === true ? known(reasoning.efforts ?? []) : [], images, pdfs: images }
  }
  if (provider === 'anthropic') {
    const entry = getAnthropicLanguageModelEntry(model)
    if (!entry.requestConfig.language.knownModel) return {}
    const { reasoning, inputs } = entry.capabilities.language
    const levels = reasoning.support === true ? ('efforts' in reasoning && reasoning.efforts ? known(reasoning.efforts) : budgetLevels) : []
    const images = flag(inputs.image)
    return { efforts: levels.length && reasoning.canDisable === true ? ['none', ...levels] : levels, images, pdfs: images }
  }
  if (provider === 'google') {
    const { reasoning, inputs } = getGoogleLanguageModelEntry(model).capabilities.language
    const images = flag(inputs.image)
    // The table doesn't say which models think; that comes from Google's list (`thinking`).
    return { efforts: 'efforts' in reasoning && reasoning.efforts ? known(reasoning.efforts) : budgetLevels, images, pdfs: images }
  }
  return {}
}

export function capabilitiesFor(provider: AssistantProvider, model: string, listed: ListedCapabilities = {}): ModelCapabilities {
  const catalog = fromCatalog(provider, model)
  let efforts = listed.efforts ?? catalog.efforts ?? []
  // Google: only models its list marks as thinking get an effort.
  if (provider === 'google') efforts = listed.thinking === true ? (listed.efforts ?? catalog.efforts ?? []) : []
  return {
    efforts,
    images: listed.images ?? catalog.images ?? null,
    pdfs: listed.pdfs ?? catalog.pdfs ?? null,
  }
}
