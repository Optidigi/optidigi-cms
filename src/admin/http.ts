import { headers } from 'next/headers'

// Use the app's own listener. Incoming Host headers must never choose where session cookies go.
export async function adminHTTP(path: string, init?: RequestInit) {
  const requestHeaders = new Headers(init?.headers)
  const cookie = (await headers()).get('cookie')
  if (cookie) requestHeaders.set('cookie', cookie)
  if (process.env.PUBLIC_SERVER_URL) requestHeaders.set('origin', process.env.PUBLIC_SERVER_URL)
  return fetch('http://127.0.0.1:' + (process.env.PORT || '3000') + '/api/' + path, {
    ...init, headers: requestHeaders, cache: 'no-store', redirect: 'error',
  })
}
