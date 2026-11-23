'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { APIError } from './api'
import { useI18n } from './i18n-provider'

// How the settings forms save: clear old errors, run the request, show a toast, and on failure
// keep the field errors Payload names (by field path) for the form to show. `invalid` gives a
// Field its invalid state; `ariaInvalid` gives the input inside it the same state.
export function useSave() {
  const { t } = useI18n()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function save<T>(request: () => Promise<T>, success: string): Promise<T | undefined> {
    setSaving(true)
    setErrors({})
    try {
      const result = await request()
      toast.success(success)
      return result
    } catch (error) {
      if (error instanceof APIError) setErrors(error.fields)
      toast.error(t('saveFailed'))
      return undefined
    } finally {
      setSaving(false)
    }
  }

  const invalid = (path: string) => (errors[path] ? { 'data-invalid': true } : {})
  const ariaInvalid = (path: string) => (errors[path] ? { 'aria-invalid': true } : {})

  return { errors, saving, save, invalid, ariaInvalid }
}
