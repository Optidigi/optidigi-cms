import { collectionLabels } from '@/site/collection-labels'
import type { Language, MessageKey, Translate } from '../i18n'

// Payload's MCP tools, grouped by what they do for the editor.
const actions: Record<string, { key: MessageKey; plural?: boolean }> = {
  findDocuments: { key: 'toolRead', plural: true },
  findDistinct: { key: 'toolRead', plural: true },
  countDocuments: { key: 'toolRead', plural: true },
  findGlobal: { key: 'toolRead' },
  findVersions: { key: 'toolVersions' },
  findVersion: { key: 'toolVersions' },
  countVersions: { key: 'toolVersions' },
  findGlobalVersions: { key: 'toolVersions' },
  findGlobalVersion: { key: 'toolVersions' },
  countGlobalVersions: { key: 'toolVersions' },
  getCollectionSchema: { key: 'toolSchema', plural: true },
  getGlobalSchema: { key: 'toolSchema' },
  getUploadInstructions: { key: 'toolSchema', plural: true },
  createDocuments: { key: 'toolCreate' },
  updateDocument: { key: 'toolUpdate' },
  deleteDocuments: { key: 'toolDelete' },
  duplicateDocument: { key: 'toolDuplicate' },
  restoreVersion: { key: 'toolRestore' },
  restoreGlobalVersion: { key: 'toolRestore' },
}

export type ToolState = 'running' | 'done' | 'failed' | 'denied' | 'proposed'

const prefixes: Record<Exclude<ToolState, 'done' | 'proposed'>, MessageKey> = {
  running: 'toolRunning',
  failed: 'toolFailed',
  denied: 'toolDenied',
}

// A plain sentence for a tool call, such as "Looked at website pages" or "Change a website page".
export function toolLabel(name: string, input: unknown, state: ToolState, t: Translate, language: Language) {
  const slug = input && typeof input === 'object' && 'slug' in input ? String((input as { slug: unknown }).slug) : ''
  const action = actions[name]
  const labels = collectionLabels[slug as keyof typeof collectionLabels]
  const thing = labels && action ? labels[action.plural ? 'plural' : 'singular'][language].toLowerCase() : t('toolContent')
  // Done reads as past tense ("Changed a page"); everything else names the action ("Change a page").
  if (!action) return t(state === 'done' ? 'toolOther' : 'toolOtherProposed', { tool: name })
  const sentence = t(state === 'done' ? action.key : (`${action.key}Proposed` as MessageKey), { thing })
  const text =
    state === 'done' || state === 'proposed'
      ? sentence
      : t(prefixes[state], { action: sentence.charAt(0).toLowerCase() + sentence.slice(1) })
  return text.charAt(0).toUpperCase() + text.slice(1)
}
