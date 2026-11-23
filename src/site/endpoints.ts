import type { Endpoint } from 'payload'

const noStore = { 'Cache-Control': 'no-store' }

export const siteEndpoints: Endpoint[] = [
  {
    path: '/health',
    method: 'get',
    disableAuth: true,
    handler: async (req) => {
      try {
        await req.payload.count({ collection: 'tenants', overrideAccess: true })
        return Response.json({ ok: true }, { headers: noStore })
      } catch {
        return Response.json({ ok: false }, { status: 503, headers: noStore })
      }
    },
  },
]
