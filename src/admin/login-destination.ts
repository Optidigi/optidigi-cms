export function loginDestination(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/api/mcp/oauth/authorize?')) return '/admin'
  return value
}
