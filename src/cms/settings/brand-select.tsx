'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'

// Which website's logo is the CMS's own, shown on the sign-in screen (Payload global `platform`).
export function BrandSelect({ websites, value }: { websites: { id: number; name: string }[]; value: number | null }) {
  const { t } = useI18n()
  const router = useRouter()
  const [current, setCurrent] = useState(value === null ? 'none' : String(value))
  const labels: Record<string, string> = { none: t('noBrand'), ...Object.fromEntries(websites.map(({ id, name }) => [String(id), name])) }

  async function change(next: string) {
    const previous = current
    setCurrent(next)
    try {
      await api('globals/platform', { method: 'POST', json: { brandWebsite: next === 'none' ? null : Number(next) } })
      toast.success(t('saved'))
      router.refresh()
    } catch {
      setCurrent(previous)
      toast.error(t('saveFailed'))
    }
  }

  return (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="brand-website">{t('cmsBrand')}</FieldLabel>
      <Select value={current} onValueChange={(next) => next && change(next as string)}>
        <SelectTrigger id="brand-website" className="w-full">
          <SelectValue>{(selected: string) => labels[selected]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{t('noBrand')}</SelectItem>
          {websites.map(({ id, name }) => (
            <SelectItem key={id} value={String(id)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription>{t('cmsBrandDescription')}</FieldDescription>
    </Field>
  )
}
