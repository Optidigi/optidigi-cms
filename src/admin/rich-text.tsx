'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { useAdminTranslations } from '@/admin/i18n-context'

import { Link2, List, ListOrdered } from 'lucide-react'
import {
  $createParagraphNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type RangeSelection,
  FORMAT_TEXT_COMMAND,
} from 'lexical'
import { $createHeadingNode, HeadingNode, QuoteNode } from '@lexical/rich-text'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from '@lexical/list'
import { $setBlocksType } from '@lexical/selection'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { Button } from '@/components/ui/button'
import type { Page } from '@/payload-types'
import {
  $createHorizontalRuleNode,
  $createLinkNode,
  $isLinkNode,
  AutoLinkNode,
  HorizontalRuleNode,
  LinkNode,
} from '@payloadcms/richtext-lexical/client'
import { editorialEmbeds } from './rich-text-embeds'

export function RichTextEditor({
  value,
  onChange,
}: {
  value?: Page['body']
  onChange: (value: string) => void
}) {
  const t = useAdminTranslations()

  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'OptidigiEditorialRichText',
        editorState: value ? JSON.stringify(value) : undefined,
        nodes: [
          HeadingNode,
          QuoteNode,
          ListNode,
          ListItemNode,
          LinkNode,
          AutoLinkNode,
          HorizontalRuleNode,
          ...editorialEmbeds,
        ],
        theme: {
          paragraph: 'my-2',
          heading: {
            h1: 'text-2xl font-semibold',
            h2: 'text-xl font-semibold',
            h3: 'text-lg font-semibold',
          },
          link: 'text-primary underline',
          quote: 'border-s-2 ps-3 text-muted-foreground',
          list: { ul: 'ms-5 list-disc', ol: 'ms-5 list-decimal' },
          text: {
            bold: 'font-semibold',
            italic: 'italic',
            underline: 'underline',
            strikethrough: 'line-through',
            underlineStrikethrough: 'underline line-through',
            code: 'font-mono',
          },
        },
        onError(error) {
          throw error
        },
      }}
    >
      <div className="rounded-md border">
        <FormatBar />
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              aria-label={t('Inhoud')}
              className="min-h-36 p-3 text-sm focus-visible:outline-ring/50"
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <OnChangePlugin
          ignoreSelectionChange
          onChange={(state) => onChange(JSON.stringify(state.toJSON()))}
        />
      </div>
    </LexicalComposer>
  )
}

const formats = ['bold', 'italic', 'underline', 'strikethrough'] as const

function FormatBar() {
  const t = useAdminTranslations()

  const [editor] = useLexicalComposerContext()
  const [selectedFormats, setSelectedFormats] = useState<string[]>([])
  const selectionRef = useRef<RangeSelection | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [linkError, setLinkError] = useState(false)
  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection()
          setSelectedFormats(
            $isRangeSelection(selection)
              ? formats.filter((format) => selection.hasFormat(format))
              : [],
          )
        })
      }),
    [editor],
  )

  function openLink() {
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      selectionRef.current = selection.clone()
      const parent = selection.anchor.getNode().getParent()
      setLink($isLinkNode(parent) ? (parent.getFields().url ?? '') : '')
      setLinkError(false)
    })
  }
  function changeBlock(heading: boolean) {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection))
        $setBlocksType(selection, () =>
          heading ? $createHeadingNode('h2') : $createParagraphNode(),
        )
    })
  }
  function editLink() {
    const url = link?.trim() ?? ''
    if (url && !/^(?:https?:\/\/|mailto:|tel:|\/(?![\/\\]))/i.test(url)) {
      setLinkError(true)
      return
    }
    const saved = selectionRef.current
    editor.update(() => {
      if (saved) $setSelection(saved.clone())
      const selection = $getSelection()
      if (!$isRangeSelection(selection) || selection.anchor.key !== selection.focus.key) return
      const anchor = selection.anchor.getNode()
      if (!$isTextNode(anchor)) return
      const parent = anchor.getParent()
      if ($isLinkNode(parent)) {
        if (url) parent.setFields({ linkType: 'custom', url, newTab: false })
        else {
          for (const child of parent.getChildren()) parent.insertBefore(child)
          parent.remove()
        }
        return
      }
      if (!url || selection.isCollapsed()) return
      const [selected] = selection.extract()
      if (!$isTextNode(selected)) return
      const link = $createLinkNode({ fields: { linkType: 'custom', url, newTab: false } })
      selected.insertBefore(link)
      link.append(selected)
    })
    setLink(null)
  }
  return (
    <div className="flex flex-wrap gap-1 border-b p-1" role="group" aria-label={t('Tekstopmaak')}>
      {formats.map((format, index) => (
        <Toggle
          key={format}
          type="button"
          size="sm"
          pressed={selectedFormats.includes(format)}
          aria-label={[t('Vet'), t('Cursief'), t('Onderstrepen'), t('Doorhalen')][index]}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)}
        >
          <span className={['font-bold', 'italic', 'underline', 'line-through'][index]}>
            {['B', 'I', 'U', 'S'][index]}
          </span>
        </Toggle>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => changeBlock(false)}
      >
        {t('Alinea')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => changeBlock(true)}
      >
        {t('Kop')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t('Opsomming')}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
      >
        <List />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t('Genummerde lijst')}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
      >
        <ListOrdered />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t('Link bewerken')}
        onMouseDown={(event) => event.preventDefault()}
        onClick={openLink}
      >
        <Link2 />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.update(() => $insertNodes([$createHorizontalRuleNode()]))}
      >
        {t('Scheidingslijn')}
      </Button>
      <Dialog
        open={link !== null}
        onOpenChange={(open) => {
          if (!open) setLink(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Link bewerken')}</DialogTitle>
            <DialogDescription>{t('Linkadres (leeg om te verwijderen)')}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="rich-text-link">{t('Linkadres')}</FieldLabel>
            <Input
              id="rich-text-link"
              value={link ?? ''}
              onChange={(event) => {
                setLink(event.target.value)
                setLinkError(false)
              }}
              aria-invalid={linkError}
              aria-describedby={linkError ? 'rich-text-link-error' : undefined}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  editLink()
                }
              }}
            />
            {linkError && (
              <FieldError id="rich-text-link-error">
                {t('Voer een geldig linkadres in.')}
              </FieldError>
            )}
          </Field>
          <DialogFooter>
            <Button type="button" onClick={editLink}>
              {t('Toepassen')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
