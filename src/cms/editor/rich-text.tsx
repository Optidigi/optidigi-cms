'use client'

import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode, HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { $getNearestNodeOfType, mergeRegister } from '@lexical/utils'
import {
  $createHorizontalRuleNode,
  $createLinkNode,
  $createUploadNode,
  $isLinkNode,
  AutoLinkNode,
  HorizontalRuleNode,
  LinkNode,
  UploadNode,
} from '@payloadcms/richtext-lexical/client'
import {
  $createParagraphNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  type LexicalNode,
  type SerializedEditorState,
  type TextFormatType,
} from 'lexical'
import {
  BoldIcon,
  CodeIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  Redo2Icon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
} from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { useI18n } from '../client/i18n-provider'
import type { MessageKey } from '../i18n'
import { MediaPicker, MediaPreview } from './media-picker'

const SiteContext = createContext<number>(0)

// Payload's own UploadNode serializes the content; only its admin decorator is replaced.
class CMSUploadNode extends UploadNode {
  static clone(node: CMSUploadNode) {
    return new CMSUploadNode({ data: node.getData(), format: node.getFormat(), key: node.getKey() })
  }

  decorate() {
    const { value } = this.getData()
    return <MediaPreview value={value} />
  }
}

const nodes = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
  HorizontalRuleNode,
  UploadNode,
  {
    replace: UploadNode,
    with: (node: UploadNode) => new CMSUploadNode({ data: node.getData(), format: node.getFormat() }),
    withKlass: CMSUploadNode,
  },
]

const theme = {
  paragraph: 'my-2 leading-7',
  heading: { h2: 'mt-6 mb-2 text-xl font-semibold', h3: 'mt-5 mb-2 text-lg font-semibold', h4: 'mt-4 mb-2 font-semibold' },
  quote: 'my-3 border-s-2 ps-4 text-muted-foreground italic',
  link: 'text-primary underline underline-offset-4',
  list: { ul: 'my-2 ms-6 list-disc', ol: 'my-2 ms-6 list-decimal', listitem: 'my-1' },
  hr: 'my-6 border-t',
  text: {
    bold: 'font-semibold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: '[text-decoration:underline_line-through]',
    code: 'rounded bg-muted px-1 py-0.5 font-mono text-sm',
  },
}

export function RichTextEditor({
  value,
  onChange,
  site,
  label,
  id,
}: {
  value: unknown
  onChange: (value: SerializedEditorState) => void
  site: number
  label: string
  id: string
}) {
  return (
    <SiteContext value={site}>
      <LexicalComposer
        initialConfig={{
          namespace: 'cms-rich-text',
          editorState: value && typeof value === 'object' && 'root' in value ? JSON.stringify(value) : undefined,
          nodes,
          theme,
          onError(error) {
            throw error
          },
        }}
      >
        <div className="rounded-md border border-input shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
          <Toolbar />
          <RichTextPlugin
            contentEditable={
              <ContentEditable id={id} aria-label={label} className="min-h-64 px-3 py-2 text-sm outline-none" />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <OnChangePlugin ignoreSelectionChange onChange={(state) => onChange(state.toJSON())} />
        </div>
      </LexicalComposer>
    </SiteContext>
  )
}

type BlockType = 'paragraph' | 'h2' | 'h3' | 'h4' | 'quote'
const blockLabels: Record<BlockType, MessageKey> = {
  paragraph: 'paragraph',
  h2: 'heading2',
  h3: 'heading3',
  h4: 'heading4',
  quote: 'quote',
}
const marks: { format: TextFormatType; label: MessageKey; icon: React.ReactNode }[] = [
  { format: 'bold', label: 'bold', icon: <BoldIcon /> },
  { format: 'italic', label: 'italic', icon: <ItalicIcon /> },
  { format: 'underline', label: 'underline', icon: <UnderlineIcon /> },
  { format: 'strikethrough', label: 'strikethrough', icon: <StrikethroughIcon /> },
  { format: 'code', label: 'inlineCode', icon: <CodeIcon /> },
]

function Toolbar() {
  const { t } = useI18n()
  const [editor] = useLexicalComposerContext()
  const site = useContext(SiteContext)
  const [formats, setFormats] = useState<TextFormatType[]>([])
  const [block, setBlock] = useState<BlockType>('paragraph')
  const [list, setList] = useState<'bullet' | 'number' | undefined>()
  const [link, setLink] = useState<{ url: string; newTab: boolean } | undefined>()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const refresh = useCallback(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return
    setFormats(marks.map(({ format }) => format).filter((format) => selection.hasFormat(format)))
    const anchor = selection.anchor.getNode()
    let top: LexicalNode | null = anchor.getKey() === 'root' ? anchor : anchor.getTopLevelElement()
    if (!top || $isRootOrShadowRoot(top)) top = null
    const listNode = $getNearestNodeOfType(anchor, ListNode)
    setList(listNode ? (listNode.getListType() === 'number' ? 'number' : 'bullet') : undefined)
    setBlock($isHeadingNode(top) ? (top.getTag() as BlockType) : $isQuoteNode(top) ? 'quote' : 'paragraph')
    const parent = anchor.getParent()
    const linkNode = $isLinkNode(parent) ? parent : $isLinkNode(anchor) ? anchor : null
    setLink(linkNode ? { url: linkNode.getFields().url ?? '', newTab: Boolean(linkNode.getFields().newTab) } : undefined)
  }, [])

  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(({ editorState }) => editorState.read(refresh)),
        editor.registerCommand(SELECTION_CHANGE_COMMAND, () => (refresh(), false), COMMAND_PRIORITY_LOW),
        editor.registerCommand(CAN_UNDO_COMMAND, (value) => (setCanUndo(value), false), COMMAND_PRIORITY_LOW),
        editor.registerCommand(CAN_REDO_COMMAND, (value) => (setCanRedo(value), false), COMMAND_PRIORITY_LOW),
      ),
    [editor, refresh],
  )

  function setBlockType(value: BlockType) {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      $setBlocksType(selection, () =>
        value === 'paragraph' ? $createParagraphNode() : value === 'quote' ? $createQuoteNode() : $createHeadingNode(value),
      )
    })
  }

  function toggleList(type: 'bullet' | 'number') {
    if (list === type) editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    else editor.dispatchCommand(type === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined)
  }

  return (
    <div
      role="toolbar"
      aria-label={t('textStyle')}
      className="flex flex-wrap items-center gap-1 border-b p-1"
      onMouseDown={(event) => {
        // Keep the editor selection when using toolbar buttons.
        if ((event.target as HTMLElement).closest('button')) event.preventDefault()
      }}
    >
      <ButtonGroup>
        <Button type="button" variant="ghost" size="icon-sm" disabled={!canUndo} aria-label={t('undo')} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
          <Undo2Icon />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" disabled={!canRedo} aria-label={t('redo')} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>
          <Redo2Icon />
        </Button>
      </ButtonGroup>
      <Separator orientation="vertical" className="mx-1 data-vertical:h-5 data-vertical:self-auto" />
      <Select value={block} onValueChange={(value) => value && setBlockType(value as BlockType)}>
        <SelectTrigger size="sm" className="w-36" aria-label={t('textStyle')}>
          <SelectValue>{(value: BlockType) => t(blockLabels[value])}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(blockLabels) as BlockType[]).map((value) => (
            <SelectItem key={value} value={value}>
              {t(blockLabels[value])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Separator orientation="vertical" className="mx-1 data-vertical:h-5 data-vertical:self-auto" />
      {marks.map(({ format, label, icon }) => (
        <Toggle
          key={format}
          size="sm"
          aria-label={t(label)}
          pressed={formats.includes(format)}
          onPressedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)}
        >
          {icon}
        </Toggle>
      ))}
      <Separator orientation="vertical" className="mx-1 data-vertical:h-5 data-vertical:self-auto" />
      <Toggle size="sm" aria-label={t('bulletList')} pressed={list === 'bullet'} onPressedChange={() => toggleList('bullet')}>
        <ListIcon />
      </Toggle>
      <Toggle size="sm" aria-label={t('numberedList')} pressed={list === 'number'} onPressedChange={() => toggleList('number')}>
        <ListOrderedIcon />
      </Toggle>
      <Separator orientation="vertical" className="mx-1 data-vertical:h-5 data-vertical:self-auto" />
      <LinkControl current={link} />
      <MediaPicker
        site={site}
        trigger={
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t('insertImage')}>
            <ImageIcon />
          </Button>
        }
        onSelect={(id) =>
          editor.update(() => {
            $insertNodes([$createUploadNode({ data: { fields: {}, relationTo: 'media', value: id } })])
          })
        }
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t('horizontalRule')}
        onClick={() => editor.update(() => $insertNodes([$createHorizontalRuleNode()]))}
      >
        <MinusIcon />
      </Button>
    </div>
  )
}

const safeURL = /^(?:https?:\/\/|mailto:|tel:|\/(?![/\\])|#)/i

function LinkControl({ current }: { current?: { url: string; newTab: boolean } }) {
  const { t } = useI18n()
  const [editor] = useLexicalComposerContext()
  const [open, setOpen] = useState(false)
  const [url, setURL] = useState('')
  const [newTab, setNewTab] = useState(false)
  const [invalid, setInvalid] = useState(false)

  function apply(remove = false) {
    const target = url.trim()
    if (!remove && !safeURL.test(target)) {
      setInvalid(true)
      return
    }
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const fields = { linkType: 'custom' as const, url: target, newTab, doc: null }
      const existing = selection.getNodes().map((node) => (node.getParent() && $isLinkNode(node.getParent()) ? node.getParent() : $isLinkNode(node) ? node : null))
      const links = [...new Set(existing.filter((node) => node && $isLinkNode(node)))]
      if (links.length) {
        for (const linkNode of links) {
          if (!$isLinkNode(linkNode)) continue
          if (remove) {
            for (const child of linkNode.getChildren()) linkNode.insertBefore(child)
            linkNode.remove()
          } else {
            linkNode.setFields(fields)
          }
        }
        return
      }
      if (remove || selection.isCollapsed()) return
      // Wrap the selected text in Payload's LinkNode.
      const texts = selection.extract().filter($isTextNode)
      let link: ReturnType<typeof $createLinkNode> | undefined
      for (const text of texts) {
        if (!link || link.getParent() !== text.getParent() || link.getNextSibling() !== text) {
          link = $createLinkNode({ fields })
          text.insertBefore(link)
        }
        link.append(text)
      }
    })
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setURL(current?.url ?? '')
          setNewTab(current?.newTab ?? false)
          setInvalid(false)
        }
      }}
    >
      <PopoverTrigger render={<Toggle size="sm" aria-label={t('link')} pressed={Boolean(current)} />}>
        <LinkIcon />
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            apply()
          }}
        >
          <FieldGroup>
            <Field data-invalid={invalid || undefined}>
              <FieldLabel htmlFor="rich-text-link">{t('linkUrl')}</FieldLabel>
              <Input
                id="rich-text-link"
                value={url}
                placeholder="https://"
                aria-invalid={invalid || undefined}
                onChange={(event) => {
                  setURL(event.target.value)
                  setInvalid(false)
                }}
              />
              {invalid && <FieldError>{t('linkUrlInvalid')}</FieldError>}
            </Field>
            <Field orientation="horizontal">
              <Checkbox id="rich-text-link-tab" checked={newTab} onCheckedChange={(checked) => setNewTab(checked === true)} />
              <FieldLabel htmlFor="rich-text-link-tab">{t('newTab')}</FieldLabel>
            </Field>
            <div className="flex justify-between gap-2">
              {current ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => apply(true)}>
                  {t('removeLink')}
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" size="sm">
                {t('apply')}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </PopoverContent>
    </Popover>
  )
}
