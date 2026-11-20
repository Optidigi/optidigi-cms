import { cache } from 'react'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { payloadSessionCookie } from './auth-contract'
import { adminHTTP } from './http'

export const preferencePath = 'payload-preferences/optidigi-admin-workspace'
export const preferenceSchema = z.object({
  language: z.enum(['nl', 'en']),
  theme: z.enum(['system', 'light', 'dark']),
  preset: z.enum(['optidigi', 'neutral', 'forest']).default('optidigi'),
  density: z.enum(['comfortable', 'compact']).default('comfortable'),
  sidebarOpen: z.boolean(),
  website: z.number().int().positive().nullable(),
})
export type Preferences = z.infer<typeof preferenceSchema>

export const readPreferences = cache(async () => {
  if (!(await cookies()).has(payloadSessionCookie)) return undefined
  const response = await adminHTTP(preferencePath)
  if (!response.ok) return undefined
  const result = await response.json()
  return preferenceSchema.safeParse(result?.value).data
})
