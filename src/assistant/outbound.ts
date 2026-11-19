import { lookup } from 'node:dns/promises'
import ipaddr from 'ipaddr.js'
import { Agent, fetch as nodeFetch } from 'undici'

export function publicHTTPSURL(value: string) {
  const url = new URL(value)
  const hostname = url.hostname
  if (
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    !hostname.includes('.') ||
    hostname.endsWith('.') ||
    ipaddr.isValid(hostname) ||
    hostname.endsWith('.localhost')
  ) {
    throw new Error('Enter a public HTTPS URL.')
  }
  return url
}

function publiclyRoutable(value: string) {
  const address = ipaddr.process(value)
  return (
    address.range() === 'unicast' &&
    (address.kind() === 'ipv4' || value.toLowerCase().match(/^[23]/) !== null)
  )
}

const dispatcher = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      void lookup(hostname, { all: true, family: options.family })
        .then((addresses) => {
          if (!addresses.length || addresses.some(({ address }) => !publiclyRoutable(address))) {
            callback(new Error('Provider destination is unavailable.'), '', 0)
          } else if (options.all) {
            callback(null, addresses)
          } else {
            const { address, family } = addresses[0]
            callback(null, address, family)
          }
        })
        .catch(() => callback(new Error('Provider DNS lookup failed.'), '', 0))
    },
  },
})

export const fetchPublicHTTPS: typeof fetch = async (input, init) => {
  const request = new Request(input, init)
  publicHTTPSURL(request.url)
  // Use the same DNS lookup to validate addresses and connect. Reject redirects.
  const response = await nodeFetch(request.url, {
    method: request.method,
    headers: [...request.headers],
    body: request.body,
    duplex: 'half',
    signal: request.signal,
    redirect: 'error',
    dispatcher,
  })
  return new Response(response.body as ReadableStream<Uint8Array> | null, {
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers],
  })
}
