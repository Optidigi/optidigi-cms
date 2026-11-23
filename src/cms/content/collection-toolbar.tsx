'use client'

import { SearchIcon } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useI18n } from '../client/i18n-provider'

// Filters live in the URL so the server queries Payload with them and links stay shareable.
export function CollectionToolbar() {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [q, setQ] = useState(params.get('q') ?? '')

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    next.delete('page')
    startTransition(() => router.replace(`${pathname}?${next}`))
  }

  useEffect(() => {
    if (q === (params.get('q') ?? '')) return
    const timer = setTimeout(() => update({ q: q || undefined }), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [q])

  const status = params.get('status') ?? 'all'
  const statusLabels: Record<string, string> = { all: t('allStatuses'), published: t('published'), draft: t('draft') }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup className="w-full sm:max-w-xs">
        <InputGroupAddon>{pending ? <Spinner /> : <SearchIcon />}</InputGroupAddon>
        <InputGroupInput
          type="search"
          aria-label={t('search')}
          placeholder={t('searchPlaceholder')}
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </InputGroup>
      <Select value={status} onValueChange={(value) => update({ status: value === 'all' ? undefined : (value as string) })}>
        <SelectTrigger aria-label={t('status')} className="w-40">
          <SelectValue>{(value: string) => statusLabels[value]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
