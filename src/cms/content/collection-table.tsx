'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { DeleteDialog } from './delete-dialog'
import { StatusBadge, formatDate } from './status-badge'

export type Row = { id: number; title?: string | null; slug?: string | null; status?: string | null; updatedAt: string }

export function CollectionTable({
  base,
  collection,
  locale,
  language,
  rows,
}: {
  base: string
  collection: string
  locale: string
  language: string
  rows: Row[]
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [deleting, setDeleting] = useState<Row>()

  if (!rows.length) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>{t('noResults')}</EmptyTitle>
          <EmptyDescription>{t('noResultsDescription')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-md border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>{t('title')}</TableHead>
              <TableHead className="hidden w-32 md:table-cell">{t('status')}</TableHead>
              <TableHead className="hidden w-44 md:table-cell">{t('updated')}</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">{t('actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const href = `${base}/${row.id}?locale=${locale}`
              const title = row.title || t('untitled')
              return (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-normal">
                    <Link href={href} className="block truncate font-medium hover:underline">
                      {title}
                    </Link>
                    <span className="block truncate text-xs text-muted-foreground">/{row.slug}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground md:hidden">
                      <StatusBadge status={row.status} t={t} />
                      {formatDate(row.updatedAt, language)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <StatusBadge status={row.status} t={t} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{formatDate(row.updatedAt, language)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`${t('actions')}: ${title}`} />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem render={<Link href={href} />}>{t('edit')}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(row)}>
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <DeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await api(`${collection}/${deleting.id}`, { method: 'DELETE' })
            toast.success(t('deleted'))
            router.refresh()
          } catch {
            toast.error(t('deleteFailed'))
          }
          setDeleting(undefined)
        }}
      />
    </>
  )
}
