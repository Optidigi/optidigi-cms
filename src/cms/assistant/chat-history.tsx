'use client'

import { ArchiveIcon, ArchiveRestoreIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api } from '../client/api'
import { useI18n } from '../client/i18n-provider'
import { DeleteDialog } from '../content/delete-dialog'
import { formatDate } from '../content/status-badge'
import { useAssistant, type ThreadSummary } from './assistant-context'

// Threads live in Payload's assistant-threads collection; rename, archive and delete use its REST API.
export function ChatHistory({ onSelect }: { onSelect?: () => void }) {
  const assistant = useAssistant()!
  const { t, language } = useI18n()
  const [view, setView] = useState<'recent' | 'archived'>('recent')
  const [renaming, setRenaming] = useState<ThreadSummary>()
  const [title, setTitle] = useState('')
  const [deleting, setDeleting] = useState<ThreadSummary>()
  const threads = assistant.threads?.filter(({ archived }) => Boolean(archived) === (view === 'archived'))

  async function update(thread: ThreadSummary, data: Partial<ThreadSummary>) {
    try {
      await api(`assistant-threads/${thread.id}?depth=0`, { method: 'PATCH', json: data })
      await assistant.refreshThreads()
    } catch {
      toast.error(t('saveFailed'))
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <Button
        variant="outline"
        onClick={() => {
          assistant.newChat()
          onSelect?.()
        }}
      >
        <PlusIcon data-icon="inline-start" />
        {t('newChat')}
      </Button>
      <ToggleGroup variant="outline" size="sm" value={[view]} onValueChange={(value) => value[0] && setView(value[0] as typeof view)} aria-label={t('history')}>
        <ToggleGroupItem value="recent" className="flex-1">{t('recent')}</ToggleGroupItem>
        <ToggleGroupItem value="archived" className="flex-1">{t('archived')}</ToggleGroupItem>
      </ToggleGroup>
      {threads === undefined ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : threads.length ? (
        <ItemGroup className="gap-1 overflow-y-auto">
          {threads.map((thread) => (
            <Item
              key={thread.id}
              size="sm"
              variant={thread.id === assistant.thread ? 'muted' : 'default'}
              aria-current={thread.id === assistant.thread || undefined}
            >
              <ItemContent className="min-w-0">
                <button
                  type="button"
                  className="text-left outline-none focus-visible:underline"
                  onClick={async () => {
                    await assistant.openThread(thread.id)
                    onSelect?.()
                  }}
                >
                  <ItemTitle className="line-clamp-1">{thread.title || t('untitled')}</ItemTitle>
                  <ItemDescription>{formatDate(thread.updatedAt, language)}</ItemDescription>
                </button>
              </ItemContent>
              <ItemActions>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`${t('actions')}: ${thread.title ?? ''}`} />}>
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setTitle(thread.title ?? '')
                        setRenaming(thread)
                      }}
                    >
                      <PencilIcon />
                      {t('rename')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => update(thread, { archived: !thread.archived })}>
                      {thread.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                      {thread.archived ? t('unarchive') : t('archive')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleting(thread)}>
                      <Trash2Icon />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      ) : (
        <p className="text-sm text-muted-foreground">{t('noChats')}</p>
      )}

      <Dialog open={Boolean(renaming)} onOpenChange={(open) => !open && setRenaming(undefined)}>
        <DialogContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if (renaming) await update(renaming, { title: title.trim() || null })
              setRenaming(undefined)
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('rename')}</DialogTitle>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="thread-title">{t('title')}</FieldLabel>
              <Input id="thread-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(undefined)}>
                {t('cancel')}
              </Button>
              <Button type="submit">{t('save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={t('deleteChatTitle')}
        description={t('deleteChatDescription')}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await api(`assistant-threads/${deleting.id}`, { method: 'DELETE' })
            if (deleting.id === assistant.thread) assistant.newChat()
            await assistant.refreshThreads()
          } catch {
            toast.error(t('deleteFailed'))
          }
          setDeleting(undefined)
        }}
      />
    </div>
  )
}
