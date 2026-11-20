'use client'

import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { FieldError } from '@/components/ui/field'
import { useAdminTranslations } from './i18n-context'
import { savePlatform } from './admin-actions'

type FormError = { field?: string; message: string }
const ErrorContext = createContext<FormError | undefined>(undefined)

export function PlatformInput(props: ComponentProps<typeof Input>) {
  const t = useAdminTranslations()
  const error = useContext(ErrorContext)
  const message = error?.field === props.name ? error?.message : undefined
  const description = message ? props.id + '-error' : undefined
  return (
    <>
      <Input {...props} aria-invalid={Boolean(message)} aria-describedby={description} />
      {message && <FieldError id={description}>{t(message)}</FieldError>}
    </>
  )
}

export function PlatformForm({ children }: { children: ReactNode }) {
  const router = useRouter()
  const t = useAdminTranslations()
  const [pending, start] = useTransition()
  const [error, setError] = useState<FormError>()
  return (
    <form
      className="border-t pt-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (pending) return
        const form = new FormData(event.currentTarget)
        setError(undefined)
        start(async () => {
          try {
            const result = await savePlatform(form)
            if (result.url) {
              router.replace(result.url)
              router.refresh()
            } else if (result.message) setError({ field: result.field, message: result.message })
          } catch {
            setError({ message: 'Opslaan is niet gelukt. Controleer de invoer.' })
          }
        })
      }}
    >
      {error && !error.field && (
        <Alert variant="destructive" role="alert" className="mb-4">
          <AlertDescription>{t(error.message)}</AlertDescription>
        </Alert>
      )}
      <ErrorContext.Provider value={error}>
        <fieldset disabled={pending} className="min-w-0">
          {children}
        </fieldset>
      </ErrorContext.Provider>
    </form>
  )
}
