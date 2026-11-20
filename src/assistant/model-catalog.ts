import { createHash } from 'node:crypto'
import { z } from 'zod'
import { modelCapabilities } from './provider'
import { type Connection, responseDetail } from './protocol'

const modelText = z.string().trim().min(1).max(150)
export const catalogOptions = z
  .object({
    models: z.array(z.object({ model: modelText, label: modelText.optional() })).max(15),
    defaultModel: modelText.optional(),
    detail: z.enum(responseDetail).optional(),
  })
  .refine(({ models }) => new Set(models.map(({ model }) => model)).size === models.length)

export function resolveCatalog(tenant: number, connection: Connection, value: unknown) {
  const options = catalogOptions.safeParse(value).data
  const entries = [
    { model: connection.model, label: connection.model },
    ...(options?.models ?? [])
      .filter(({ model }) => model !== connection.model)
      .map(({ model, label }) => ({ model, label: label || model })),
  ]
  const models = entries.map(({ model, label }) => ({
    id: createHash('sha256')
      .update(JSON.stringify([tenant, connection.provider, model]))
      .digest('hex'),
    model,
    label,
    capabilities: modelCapabilities(connection.provider, model),
  }))
  const fallback = models.find(({ model }) => model === options?.defaultModel) ?? models[0]
  return { models, fallback, detail: options?.detail ?? 'standard', options }
}
