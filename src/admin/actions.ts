import type { SaveResult } from '@/site/admin/contracts'

export type { SaveResult } from '@/site/admin/contracts'

export async function saveEditorial(form: FormData): Promise<{ result: SaveResult; id?: number }> {
  const response = await fetch('/api/cms-admin/editorial', { method: 'POST', body: form })
  return response.ok ? response.json() : { result: 'failed' }
}
