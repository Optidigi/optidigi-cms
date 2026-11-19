import type { PayloadRequest } from 'payload'

export function assistantMemberships(user: PayloadRequest['user'] | undefined) {
  if (!user || user.collection !== 'users') return []
  return (user.tenants ?? []).flatMap(({ tenant, role }) => {
    const id = typeof tenant === 'object' ? tenant?.id : tenant
    return Number.isSafeInteger(id) && id > 0 ? [{ id, canManage: role === 'admin' }] : []
  })
}
