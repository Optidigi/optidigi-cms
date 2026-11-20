import { adminTranslations } from './i18n-server'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

export async function CollectionPagination({
  previous,
  next,
}: {
  previous?: string | null
  next?: string | null
}) {
  if (!previous && !next) return null
  const t = await adminTranslations()
  return (
    <Pagination className="justify-end border-t p-2" aria-label={t('Paginering')}>
      <PaginationContent>
        {previous && (
          <PaginationItem>
            <PaginationPrevious href={previous} text={t('Vorige')} aria-label={t('Vorige')} />
          </PaginationItem>
        )}
        {next && (
          <PaginationItem>
            <PaginationNext href={next} text={t('Volgende')} aria-label={t('Volgende')} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  )
}
