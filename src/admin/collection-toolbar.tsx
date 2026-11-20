import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { adminTranslations } from './i18n-server'

export async function CollectionToolbar({
  action,
  search,
  placeholder,
  locale,
  sort,
  status,
}: {
  action: string
  search: string
  placeholder: string
  locale?: string
  sort: string
  status?: string
}) {
  const t = await adminTranslations()
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {locale && <input type="hidden" name="locale" value={locale} />}
      <div className="relative min-w-0 flex-1 basis-52">
        <Search
          aria-hidden
          className="pointer-events-none absolute start-3 top-2.5 size-4 text-muted-foreground"
        />
        <Input
          type="search"
          name="q"
          aria-label={placeholder}
          placeholder={placeholder}
          defaultValue={search}
          maxLength={150}
          className="ps-9"
        />
      </div>
      {status !== undefined && (
        <NativeSelect name="status" aria-label={t('Status')} defaultValue={status}>
          <NativeSelectOption value="">{t('Alle statussen')}</NativeSelectOption>
          <NativeSelectOption value="draft">{t('Concept')}</NativeSelectOption>
          <NativeSelectOption value="published">{t('Gepubliceerd')}</NativeSelectOption>
        </NativeSelect>
      )}
      <NativeSelect name="sort" aria-label={t('Sorteren')} defaultValue={sort}>
        <NativeSelectOption value="recent">{t('Laatst gewijzigd')}</NativeSelectOption>
        <NativeSelectOption value="oldest">{t('Oudste eerst')}</NativeSelectOption>
        <NativeSelectOption value="name">{t('Naam A–Z')}</NativeSelectOption>
      </NativeSelect>
      <Button type="submit" variant="outline">
        {t('Toepassen')}
      </Button>
    </form>
  )
}
