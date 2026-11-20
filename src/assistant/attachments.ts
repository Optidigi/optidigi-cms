import { basename, join } from 'node:path'
import { readFile } from 'node:fs/promises'
import type { FileUIPart } from 'ai'
import { APIError, type PayloadRequest } from 'payload'
import { z } from 'zod'
import { assistantUploadDir, assistantUploadLimit } from './collections'
import type { AssistantUIMessage } from './protocol'

const missingAttachment = () =>
  new APIError('An attachment is unavailable in this conversation.', 400)

const userMessage = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  role: z.literal('user'),
  parts: z
    .array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('text'), text: z.string().max(6000) }),
        z.object({ type: z.literal('file'), url: z.string().max(2048) }),
      ]),
    )
    .min(1)
    .max(4),
})

function locate(url: string, origin: string, api: string) {
  let parsed: URL
  try {
    parsed = new URL(url, origin)
  } catch {
    throw missingAttachment()
  }
  if (
    parsed.origin !== origin ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw missingAttachment()
  }

  const collection = (['assistant-uploads', 'media'] as const).find((slug) =>
    parsed.pathname.startsWith(api + '/' + slug + '/file/'),
  )
  if (!collection) throw missingAttachment()

  let filename: string
  try {
    filename = decodeURIComponent(parsed.pathname.slice((api + '/' + collection + '/file/').length))
  } catch {
    throw missingAttachment()
  }
  if (
    !filename ||
    filename === '.' ||
    filename === '..' ||
    basename(filename) !== filename ||
    /[\\\0]/.test(filename)
  ) {
    throw missingAttachment()
  }
  return { collection, filename, pathname: parsed.pathname }
}

async function readAttachment(
  req: PayloadRequest,
  origin: string,
  tenant: number,
  thread: number,
  url: string,
  allowed: string[],
  limit = assistantUploadLimit,
) {
  const { collection, filename, pathname } = locate(url, origin, req.payload.config.routes.api)
  const {
    docs: [file],
  } = await req.payload.find({
    collection,
    where: {
      tenant: { equals: tenant },
      filename: { equals: filename },
      ...(collection === 'assistant-uploads' && { thread: { equals: thread } }),
    },
    depth: 0,
    limit: 1,
    req,
    overrideAccess: false,
  })
  if (!file?.mimeType || !file.filesize || !allowed.includes(file.mimeType))
    throw missingAttachment()
  if (file.filesize > assistantUploadLimit) {
    throw new APIError('Attachments must be no larger than 4 MiB.', 400)
  }
  if (file.filesize > limit) throw missingAttachment()

  const directory =
    collection === 'assistant-uploads' ? assistantUploadDir : (process.env.UPLOADS_DIR ?? 'media')
  const contents = await readFile(join(directory, filename)).catch(() => {
    throw missingAttachment()
  })
  if (contents.length > assistantUploadLimit || contents.length !== file.filesize)
    throw missingAttachment()
  const part: FileUIPart = { type: 'file', mediaType: file.mimeType, filename, url: pathname }

  if (file.mimeType === 'text/plain') {
    let text: string
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(contents)
    } catch {
      throw missingAttachment()
    }
    if (text.includes('\0')) throw missingAttachment()
    return {
      part,
      size: contents.length,
      model: {
        type: 'text' as const,
        text: `Attached text file ${filename}${text.length > 120_000 ? ' (first 120,000 characters)' : ''}:\n${text.slice(0, 120_000)}`,
      },
    }
  }

  return {
    part,
    size: contents.length,
    model: { ...part, url: 'data:' + file.mimeType + ';base64,' + contents.toString('base64') },
  }
}

export async function prepareUserMessage(
  req: PayloadRequest,
  {
    origin,
    tenant,
    thread,
    input,
    allowed,
  }: {
    origin: string
    tenant: number
    thread: number
    input: unknown
    allowed: string[]
  },
) {
  const message = userMessage.safeParse(input)
  if (!message.success)
    throw new APIError('Enter a user message with up to three attachments.', 400)
  const texts = message.data.parts.flatMap((part) => (part.type === 'text' ? [part.text] : []))
  const text = texts.join('\n').trim()
  const files = message.data.parts.filter((part) => part.type === 'file')
  if (files.length > 3 || text.length > 6000 || (!text && !files.length)) {
    throw new APIError('Enter a user message with up to three attachments.', 400)
  }

  const parts: AssistantUIMessage['parts'] = text ? [{ type: 'text', text }] : []
  const modelParts = [...parts]
  for (const { url } of files) {
    const file = await readAttachment(req, origin, tenant, thread, url, allowed)
    parts.push(file.part)
    modelParts.push(file.model)
  }
  const base = { id: message.data.id, role: 'user' as const }
  return {
    stored: { ...base, parts } satisfies AssistantUIMessage,
    model: { ...base, parts: modelParts } satisfies AssistantUIMessage,
  }
}

export async function prepareModelHistory(
  req: PayloadRequest,
  history: AssistantUIMessage[],
  {
    origin,
    tenant,
    thread,
    allowed,
  }: { origin: string; tenant: number; thread: number; allowed: string[] },
) {
  const selected: AssistantUIMessage[] = []
  let remaining = assistantUploadLimit
  let attempted = 0
  for (const { id, role, parts } of [...history].reverse()) {
    const content: AssistantUIMessage['parts'] = []
    for (const part of parts) {
      if (part.type === 'text') content.push({ type: 'text', text: part.text })
      if (part.type !== 'file' || role !== 'user') continue
      // Reuse older files only after rechecking access, with a separate 4 MiB budget.
      if (remaining > 0 && attempted < 3) {
        attempted++
        const file = await readAttachment(
          req,
          origin,
          tenant,
          thread,
          part.url,
          allowed,
          remaining,
        ).catch(() => null)
        if (file) {
          remaining -= file.size
          content.push(file.model)
          continue
        }
      }
      content.push({ type: 'text', text: '[Previously attached file: ' + part.filename + ']' })
    }
    if (content.length) selected.push({ id, role, parts: content })
  }
  return selected.reverse()
}
