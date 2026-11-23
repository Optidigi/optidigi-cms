import type { Translate } from '../i18n'
import type { Provider, Service } from './ai-services'

// A website's AI connections as the settings screen shows them (keys are never read).
export type ConnectionView = { id: string; label: string; provider: Provider; baseURL: string; hasKey: boolean; models: string[] }
export type SettingsView = { id: number; connections: ConnectionView[]; defaultModel: string }
// A model as the service lists it; `tools` is false when the service says it can't use tools.
export type Listed = { id: string; name: string; tools?: boolean }

export const serviceName = (service: Service, t: Translate) => service.name || t('customService')

// Groups folded under "More services" in the picker.
export const moreGroups: string[] = ['other', 'custom']

// The connection list sent back to Payload. Keys are never read, so other rows go without one and
// keep their stored key; `change` adds a new key for one row.
export function rowsFor(connections: ConnectionView[], change?: { id?: string; apiKey?: string }) {
  return connections.map(({ id, label, provider, baseURL, models }) => ({
    ...(id ? { id } : {}),
    label,
    provider,
    baseURL: baseURL.trim() || null,
    models,
    ...(change?.apiKey && change.id === id ? { apiKey: change.apiKey } : {}),
  }))
}

export function toView(doc: { id: number; connections?: Partial<ConnectionView>[] | null; defaultModel?: string | null }): SettingsView {
  return {
    id: doc.id,
    defaultModel: doc.defaultModel ?? '',
    connections: (doc.connections ?? []).map((row) => ({
      id: row.id ?? '',
      label: row.label ?? '',
      provider: (row.provider ?? 'anthropic') as Provider,
      baseURL: row.baseURL ?? '',
      hasKey: Boolean(row.hasKey),
      models: row.models ?? [],
    })),
  }
}
