// Thin wrapper around Payload's REST API. The session cookie authenticates every request.

export class APIError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string> = {},
    readonly code?: string,
  ) {
    super(message)
  }
}

// Payload's own errors, or `{ error, code }` from the CMS's custom endpoints.
type PayloadErrorBody = {
  errors?: { message?: string; data?: { errors?: { path?: string; message?: string }[] } }[]
  error?: string
  code?: string
}

export async function api<T = unknown>(
  path: string,
  { json, ...init }: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const response = await fetch('/api/' + path, {
    credentials: 'same-origin',
    ...init,
    headers: json === undefined ? init.headers : { 'Content-Type': 'application/json', ...init.headers },
    body: json === undefined ? init.body : JSON.stringify(json),
  })
  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const parsed = body as PayloadErrorBody | null
    const errors = parsed?.errors ?? []
    const fields: Record<string, string> = {}
    for (const error of errors) {
      for (const field of error.data?.errors ?? []) {
        if (field.path && field.message) fields[field.path] = field.message
      }
    }
    throw new APIError(errors[0]?.message ?? parsed?.error ?? response.statusText, response.status, fields, parsed?.code)
  }
  return body as T
}

export function query(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const text = search.toString()
  return text ? '?' + text : ''
}
