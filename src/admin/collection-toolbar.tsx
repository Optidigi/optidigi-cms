import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { adminTranslations } from './i18n-server'

export async function CollectionToolbar({
  action,
  search,
  placeholder,
  locale,
  sort,
  status,
  website,
  scope,
}: {
  action: string
  search: string
  placeholder: string
  locale?: string
  sort?: string
  status?: string
  website?: number
  scope?: string
}) {
  const t = await adminTranslations()
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {website && <input type="hidden" name="website" value={website} />}
      {scope && <input type="hidden" name="group" value={scope} />}
      {locale && <input type="hidden" name="locale" value={locale} />}
      <InputGroup className="min-w-0 flex-1 basis-44">
        <InputGroupInput
          type="search"
          name="q"
          aria-label={placeholder}
          placeholder={placeholder}
          defaultValue={search}
          maxLength={150}
        />
        <InputGroupAddon>
          <Search aria-hidden />
        </InputGroupAddon>
      </InputGroup>
      {status !== undefined && (
        <NativeSelect name="status" aria-label={t('Status')} defaultValue={status}>
          <NativeSelectOption value="">{t('Alle statussen')}</NativeSelectOption>
          <NativeSelectOption value="draft">{t('Concept')}</NativeSelectOption>
          <NativeSelectOption value="published">{t('Gepubliceerd')}</NativeSelectOption>
        </NativeSelect>
      )}
      {sort && (
        <NativeSelect name="sort" aria-label={t('Sorteren')} defaultValue={sort}>
          <NativeSelectOption value="recent">{t('Laatst gewijzigd')}</NativeSelectOption>
          <NativeSelectOption value="oldest">{t('Oudste eerst')}</NativeSelectOption>
          <NativeSelectOption value="name">{t('Naam A–Z')}</NativeSelectOption>
        </NativeSelect>
      )}
      <Button type="submit" variant="outline">
        {t('Toepassen')}
      </Button>
    </form>
  )
}
