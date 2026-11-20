import {
  APIError,
  commitTransaction,
  initTransaction,
  killTransaction,
  type PayloadRequest,
} from 'payload'
import { relationID } from '../site/access'
import type { AssistantThreadSummary, AssistantUIMessage } from './protocol'

const newTitle = 'Nieuw gesprek'
const pending = new Set<number>()

export function holdThread(thread: number) {
  if (pending.has(thread))
    throw new APIError('This conversation already has a request in progress.', 409)
  pending.add(thread)
  let held = true
  return () => {
    if (!held) return
    held = false
    pending.delete(thread)
  }
}

function owner(req: PayloadRequest) {
  const id = req.user?.collection === 'users' ? relationID(req.user.id) : undefined
  if (!id) throw new APIError('Sign in to use the assistant.', 401)
  return id
}

const threadScope = (req: PayloadRequest, tenant: number) => ({
  owner: { equals: owner(req) },
  tenant: { equals: tenant },
})

function summary(thread: {
  id: number
  title: string
  updatedAt: string
  archived?: boolean | null
}): AssistantThreadSummary {
  return {
    id: thread.id,
    title: thread.title,
    updatedAt: thread.updatedAt,
    archived: Boolean(thread.archived),
  }
}

export async function findThread(req: PayloadRequest, tenant: number, id: number) {
  const {
    docs: [thread],
  } = await req.payload.find({
    collection: 'assistant-threads',
    where: { ...threadScope(req, tenant), id: { equals: id } },
    req,
    overrideAccess: true,
    depth: 0,
    limit: 1,
  })
  if (!thread) throw new APIError('Conversation not found.', 404)
  return thread
}

export async function listThreads(
  req: PayloadRequest,
  tenant: number,
  { archived, page, query }: { archived?: boolean; page?: number; query?: string },
) {
  const result = await req.payload.find({
    collection: 'assistant-threads',
    req,
    overrideAccess: true,
    depth: 0,
    where: {
      ...threadScope(req, tenant),
      archived: archived ? { equals: true } : { not_equals: true },
      ...(query && { title: { contains: query } }),
    },
    limit: 30,
    page: page ?? 1,
    sort: ['-updatedAt', '-id'],
  })
  return {
    threads: result.docs.map(summary),
    ...(result.nextPage && { nextPage: result.nextPage }),
  }
}

export async function createThread(req: PayloadRequest, tenant: number) {
  const thread = await req.payload.create({
    collection: 'assistant-threads',
    data: { owner: owner(req), tenant, title: newTitle, archived: false },
    req,
    overrideAccess: true,
    depth: 0,
  })
  return { thread: summary(thread), messages: [] as AssistantUIMessage[] }
}

export async function readThread(req: PayloadRequest, tenant: number, id: number) {
  const thread = await findThread(req, tenant, id)
  const { docs } = await req.payload.find({
    collection: 'assistant-messages',
    where: { thread: { equals: thread.id } },
    req,
    overrideAccess: true,
    depth: 0,
    pagination: false,
    sort: 'id',
  })
  return {
    thread: summary(thread),
    messages: docs.map(({ message }) => message as unknown as AssistantUIMessage),
  }
}

export async function updateThread(
  req: PayloadRequest,
  tenant: number,
  id: number,
  data: { title?: string; archived?: boolean },
) {
  await findThread(req, tenant, id)
  const release = holdThread(id)
  try {
    const thread = await req.payload.update({
      collection: 'assistant-threads',
      id,
      data,
      req,
      overrideAccess: true,
      depth: 0,
    })
    return { thread: summary(thread) }
  } finally {
    release()
  }
}

export async function deleteThread(req: PayloadRequest, tenant: number, id: number) {
  await findThread(req, tenant, id)
  const release = holdThread(id)
  try {
    // Remove related uploads through Payload so it removes the private files too.
    const filter = { thread: { equals: id } }
    const started = await initTransaction(req)
    try {
      const uploads = await req.payload.delete({
        collection: 'assistant-uploads',
        where: filter,
        req,
        overrideAccess: true,
        depth: 0,
      })
      if (uploads.errors.length) throw new Error('Conversation attachments could not be deleted.')
      const messages = await req.payload.delete({
        collection: 'assistant-messages',
        where: filter,
        req,
        overrideAccess: true,
        depth: 0,
      })
      if (messages.errors.length) throw new Error('Conversation messages could not be deleted.')
      await req.payload.delete({
        collection: 'assistant-threads',
        id,
        req,
        overrideAccess: true,
        depth: 0,
      })
      if (started) await commitTransaction(req)
    } catch (error) {
      if (started) await killTransaction(req)
      throw error
    }
    return { deleted: true }
  } finally {
    release()
  }
}

export async function recentThreadMessages(req: PayloadRequest, thread: number) {
  const { docs } = await req.payload.find({
    collection: 'assistant-messages',
    where: { thread: { equals: thread } },
    req,
    overrideAccess: true,
    depth: 0,
    limit: 24,
    sort: '-id',
  })
  return docs.reverse().map(({ message }) => message as unknown as AssistantUIMessage)
}

export async function assertNewMessage(req: PayloadRequest, thread: number, messageId: string) {
  const { totalDocs } = await req.payload.count({
    collection: 'assistant-messages',
    where: { thread: { equals: thread }, messageId: { equals: messageId } },
    req,
    overrideAccess: true,
  })
  if (totalDocs)
    throw new APIError('This message was already submitted. Reload the conversation.', 409)
}

export async function saveThreadMessage(
  req: PayloadRequest,
  thread: number,
  message: AssistantUIMessage,
  title?: string,
) {
  const started = await initTransaction(req)
  try {
    await req.payload.create({
      collection: 'assistant-messages',
      data: { thread, messageId: message.id, message: { ...message } },
      req,
      overrideAccess: true,
      depth: 0,
    })
    await req.payload.update({
      collection: 'assistant-threads',
      id: thread,
      data: title ? { title } : {},
      req,
      overrideAccess: true,
      depth: 0,
    })
    if (started) await commitTransaction(req)
  } catch (error) {
    if (started) await killTransaction(req)
    throw error
  }
}

export function initialThreadTitle(
  originalTitle: string,
  isNew: boolean,
  message: AssistantUIMessage,
) {
  if (!isNew || originalTitle !== newTitle) return undefined
  const text = message.parts.find((part) => part.type === 'text')
  const file = message.parts.find((part) => part.type === 'file')
  const title = text?.text || file?.filename
  return title?.replace(/\s+/g, ' ').trim().slice(0, 120) || undefined
}
