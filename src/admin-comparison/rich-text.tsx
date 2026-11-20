'use client'

import { useComparisonTranslations } from '@/admin-comparison/i18n-context'

import { List, ListOrdered } from 'lucide-react'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
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

export function RichTextEditor({
  value,
  onChange,
}: {
  value?: Page['body']
  onChange: (value: string) => void
}) {
  const t = useComparisonTranslations()

  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'OptidigiEditorialRichText',
        editorState: value ? JSON.stringify(value) : undefined,
        nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
        theme: {
          paragraph: 'my-2',
          heading: {
            h1: 'text-2xl font-semibold',
            h2: 'text-xl font-semibold',
            h3: 'text-lg font-semibold',
          },
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

function FormatBar() {
  const t = useComparisonTranslations()

  const [editor] = useLexicalComposerContext()
  function changeBlock(heading: boolean) {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection))
        $setBlocksType(selection, () =>
          heading ? $createHeadingNode('h2') : $createParagraphNode(),
        )
    })
  }
  return (
    <div className="flex flex-wrap gap-1 border-b p-1" role="group" aria-label={t('Tekstopmaak')}>
      {(['bold', 'italic', 'underline', 'strikethrough'] as const).map((format, index) => (
        <Button
          key={format}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={[t('Vet'), t('Cursief'), t('Onderstrepen'), t('Doorhalen')][index]}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)}
        >
          <span className={['font-bold', 'italic', 'underline', 'line-through'][index]}>
            {['B', 'I', 'U', 'S'][index]}
          </span>
        </Button>
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
    </div>
  )
}
