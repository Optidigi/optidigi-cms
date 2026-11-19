import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

export function isPlatformAdmin(user: PayloadRequest['user']) {
  return user?.collection === 'users' && user.role === 'platform-admin'
}

export const platformOnly: Access & FieldAccess = ({ req }) => isPlatformAdmin(req.user)
export const signedIn: Access = ({ req }) => req.user?.collection === 'users'

export function relationID(value: unknown): number | undefined {
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return relationID(value.id)
  }
  if (typeof value === 'string' && !/^\d+$/.test(value)) return undefined
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : undefined
}

export function tenantIDs(user: PayloadRequest['user']) {
  return (user?.tenants ?? []).flatMap(({ tenant }) => {
    const id = relationID(tenant)
    return id === undefined ? [] : [id]
  })
}

export const tenantDelete: Access = ({ req }) => {
  if (isPlatformAdmin(req.user)) return true
  const ids = (req.user?.tenants ?? []).flatMap(({ role, tenant }) => {
    const id = relationID(tenant)
    return role === 'admin' && id !== undefined ? [id] : []
  })
  return ids.length ? { tenant: { in: ids } } : false
}

export function andFilter(access: true | Where, where: Where): Where {
  return access === true ? where : { and: [access, where] }
}
