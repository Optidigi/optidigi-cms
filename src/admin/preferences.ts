import { cache } from 'react'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { adminHTTP } from './http'

export const preferencePath = 'payload-preferences/optidigi-admin-workspace'
export const preferenceSchema = z.object({
  language: z.enum(['nl', 'en']),
  theme: z.enum(['system', 'light', 'dark']),
  sidebarOpen: z.boolean(),
  website: z.number().int().positive().nullable(),
})
export type Preferences = z.infer<typeof preferenceSchema>

export const readPreferences = cache(async () => {
  if (!(await cookies()).has('payload-token')) return undefined
  const response = await adminHTTP(preferencePath)
  if (!response.ok) return undefined
  const result = await response.json()
  return preferenceSchema.safeParse(result?.value).data
})
