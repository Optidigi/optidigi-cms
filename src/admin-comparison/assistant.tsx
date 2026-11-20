'use client'

import Link from 'next/link'
import {
  ArrowUp,
  ChevronDown,
  ExternalLink,
  Plus,
  Settings2,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react'
import { createContext, useContext, useState, type ReactNode } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Message, MessageContent } from '@/components/ui/message'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import {
  useAssistant,
  type AssistantContext,
  type AssistantController,
  type AssistantTenant,
} from '@/assistant/use-assistant'
import type { ModelProvider, ResponseDetail } from '@/assistant/protocol'

const responseLabels: Record<ResponseDetail, string> = {
  brief: 'Kort',
  standard: 'Standaard',
  detailed: 'Uitgebreid',
}

const AssistantState = createContext<{ chat: AssistantController; tenant: AssistantTenant } | null>(
  null,
)

export function ShadcnAssistantProvider({
  tenant,
  document,
  locale,
  children,
}: {
  tenant: AssistantTenant
  document?: AssistantContext
  locale: 'nl' | 'en'
  children: ReactNode
}) {
  const chat = useAssistant({ endpoint: '/api/assistant', tenant, document, locale })
  return <AssistantState.Provider value={{ chat, tenant }}>{children}</AssistantState.Provider>
}

export function ShadcnAssistantLauncher({ route }: { route: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        <Sparkles data-icon="inline-start" /> Vraag AI
      </SheetTrigger>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="flex-row items-center justify-between gap-3 border-b pe-14">
          <div>
            <SheetTitle>AI-assistent</SheetTitle>
            <SheetDescription className="sr-only">
              Assistent voor de actieve website
            </SheetDescription>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Open assistentpagina"
            nativeButton={false}
            render={<Link href={route} onClick={() => setOpen(false)} />}
          >
            <ExternalLink />
          </Button>
        </SheetHeader>
        <ShadcnAssistantBody />
      </SheetContent>
    </Sheet>
  )
}

export function ShadcnAssistantBody() {
  const state = useContext(AssistantState)
  if (!state) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Sparkles />
          </EmptyMedia>
          <EmptyTitle>Assistent niet beschikbaar</EmptyTitle>
          <EmptyDescription>Je account heeft geen lidmaatschap voor deze website.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return <Chat {...state} />
}

function Chat({ chat, tenant }: { chat: AssistantController; tenant: AssistantTenant }) {
  const [settings, setSettings] = useState(false)
  const streaming = chat.busy === 'chat'
  const connected = chat.model?.connected
  const model = chat.model?.settings
  const reply = chat.turns.at(-1)
  const modelLabel = chat.model?.model ?? 'Verbind een model'

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <Badge variant="secondary" className="max-w-full truncate">
          {tenant.name}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          disabled={!chat.turns.length || Boolean(chat.busy)}
          onClick={chat.reset}
        >
          <Plus data-icon="inline-start" /> Nieuw gesprek
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <MessageScrollerProvider autoScroll>
          <MessageScroller>
            <MessageScrollerViewport role="log" aria-label="Gesprek" aria-live="polite">
              <MessageScrollerContent className="mx-auto max-w-3xl gap-5 px-4 py-4">
                {!chat.turns.length && (
                  <Empty className="my-auto">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Sparkles />
                      </EmptyMedia>
                      <EmptyTitle>Waar kan ik mee helpen?</EmptyTitle>
                      <EmptyDescription>
                        Vraag iets over je website of maak samen een concept.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
                {chat.turns.map(({ id, role, content }) => (
                  <MessageScrollerItem key={id} messageId={id} scrollAnchor={role === 'user'}>
                    <Message align={role === 'user' ? 'end' : 'start'}>
                      <MessageContent>
                        {role === 'user' ? (
                          <Bubble align="end" variant="muted">
                            <BubbleContent className="whitespace-pre-wrap">{content}</BubbleContent>
                          </Bubble>
                        ) : (
                          <div className="select-text break-words text-sm leading-relaxed [&_a]:underline [&_code]:break-all [&_li]:ms-4 [&_ol]:list-decimal [&_p+p]:mt-3 [&_pre]:overflow-auto [&_ul]:list-disc">
                            <Markdown remarkPlugins={[remarkGfm]} disallowedElements={['img']}>
                              {content}
                            </Markdown>
                          </div>
                        )}
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ))}
                {streaming && reply?.role !== 'assistant' && (
                  <p
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                    role="status"
                  >
                    <Spinner /> Assistent antwoordt…
                  </p>
                )}
                {chat.result && (
                  <Alert>
                    <AlertTitle>Homepageconcept opgeslagen</AlertTitle>
                    <AlertDescription className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={
                          <Link
                            href={
                              '/admin-shadcn/' +
                              tenant.id +
                              '/pages?id=' +
                              chat.result.id +
                              '&locale=' +
                              chat.result.locale
                            }
                          />
                        }
                      >
                        Open concept
                      </Button>
                      {chat.result.preview && (
                        <Button
                          size="sm"
                          variant="outline"
                          nativeButton={false}
                          render={<a href={chat.result.preview} target="_blank" rel="noreferrer" />}
                        >
                          Open voorbeeld
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                {chat.approval && (
                  <Item variant="outline" size="sm">
                    <ItemMedia variant="icon">
                      <Trash2 />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{chat.approval.label} verwijderen?</ItemTitle>
                      <ItemDescription>Dit verwijdert het document uit Payload.</ItemDescription>
                    </ItemContent>
                    <ItemActions className="flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={Boolean(chat.busy)}
                        onClick={chat.reject}
                      >
                        Annuleren
                      </Button>
                      {tenant.canManage && (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={Boolean(chat.busy)}
                          onClick={chat.approve}
                        >
                          Verwijderen
                        </Button>
                      )}
                    </ItemActions>
                  </Item>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>
      <footer className="mx-auto w-full max-w-3xl space-y-2 px-4 pb-4 pt-2">
        <div
          role={chat.error ? 'alert' : 'status'}
          className={chat.error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
        >
          {chat.error || chat.notice || (!chat.model ? 'Modelverbinding laden…' : '')}
        </div>
        {connected === false && !tenant.canManage && (
          <p className="text-sm text-muted-foreground">
            Vraag je websitebeheerder om een model te verbinden.
          </p>
        )}
        {settings && tenant.canManage && (
          <ModelConnection key={model?.provider} chat={chat} onSaved={() => setSettings(false)} />
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            chat.send()
          }}
        >
          <InputGroup className="rounded-xl">
            <InputGroupTextarea
              aria-label="Bericht"
              value={chat.input}
              rows={2}
              maxLength={6000}
              disabled={!connected}
              placeholder="Hoe kan ik helpen?"
              onChange={(event) => chat.setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
            />
            <InputGroupAddon align="block-end" className="flex-wrap">
              {tenant.canManage ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<InputGroupButton size="sm" className="max-w-full" />}
                    disabled={Boolean(chat.busy)}
                  >
                    <span className="truncate">{modelLabel}</span>
                    <ChevronDown />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuGroup>
                      {connected && <DropdownMenuLabel>Verbonden model</DropdownMenuLabel>}
                      <DropdownMenuItem onClick={() => setSettings(!settings)}>
                        <Settings2 /> {connected ? 'Modelverbinding beheren' : 'Model verbinden'}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                chat.model?.model && <Badge variant="secondary">{chat.model.model}</Badge>
              )}
              {connected && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={'Antwoordlengte: ' + responseLabels[chat.detail]}
                    render={<InputGroupButton size="sm" />}
                  >
                    {responseLabels[chat.detail]}
                    <ChevronDown />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuRadioGroup
                      value={chat.detail}
                      onValueChange={(value) => chat.setDetail(value as ResponseDetail)}
                    >
                      <DropdownMenuLabel>Antwoordlengte</DropdownMenuLabel>
                      {Object.entries(responseLabels).map(([value, label]) => (
                        <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                          {label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <InputGroupButton
                size="icon-sm"
                variant="default"
                className="ms-auto rounded-full"
                type={streaming ? 'button' : 'submit'}
                aria-label={streaming ? 'Stop' : 'Versturen'}
                disabled={
                  !streaming &&
                  (!connected || !chat.input.trim() || Boolean(chat.approval) || Boolean(chat.busy))
                }
                onClick={streaming ? chat.stop : undefined}
              >
                {streaming ? <Square /> : <ArrowUp />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
      </footer>
    </div>
  )
}

function ModelConnection({ chat, onSaved }: { chat: AssistantController; onSaved: () => void }) {
  const values = chat.model?.settings
  const [provider, setProvider] = useState<ModelProvider>(values?.provider ?? 'openai')
  return (
    <Card size="sm">
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const form = event.currentTarget
            void chat.connect(new FormData(form), () => {
              form.reset()
              onSaved()
            })
          }}
        >
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="model-provider">Provider</FieldLabel>
              <NativeSelect
                id="model-provider"
                name="provider"
                value={provider}
                onChange={(event) => setProvider(event.target.value as ModelProvider)}
              >
                <NativeSelectOption value="openai">OpenAI</NativeSelectOption>
                <NativeSelectOption value="anthropic">Anthropic</NativeSelectOption>
                <NativeSelectOption value="openai-compatible">OpenAI-compatible</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="model-id">Model-ID</FieldLabel>
              <Input id="model-id" name="model" required defaultValue={values?.model} />
            </Field>
            {provider === 'openai-compatible' && (
              <Field>
                <FieldLabel htmlFor="model-url">Provider-URL</FieldLabel>
                <Input
                  id="model-url"
                  name="baseURL"
                  type="url"
                  required
                  defaultValue={values?.baseURL ?? ''}
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="model-key">API-sleutel</FieldLabel>
              <Input
                id="model-key"
                name="apiKey"
                type="password"
                required
                autoComplete="new-password"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" type="submit" disabled={Boolean(chat.busy)}>
                Verbinding opslaan
              </Button>
              {chat.model?.connected && (
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  disabled={Boolean(chat.busy)}
                  onClick={() => void chat.disconnect()}
                >
                  Loskoppelen
                </Button>
              )}
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
