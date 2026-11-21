'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { useI18n } from '../client/i18n-provider'

export function ListPagination({ page, pages }: { page: number; pages: number }) {
  const { t } = useI18n()
  const pathname = usePathname()
  const params = useSearchParams()
  if (pages <= 1) return null
  const href = (target: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(target))
    return `${pathname}?${next}`
  }
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">{t('pageOf', { page, pages })}</p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={page > 1 ? href(page - 1) : undefined}
              aria-disabled={page <= 1}
              className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
              text={t('previous')}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href={page < pages ? href(page + 1) : undefined}
              aria-disabled={page >= pages}
              className={page >= pages ? 'pointer-events-none opacity-50' : undefined}
              text={t('next')}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
