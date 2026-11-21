'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api, query } from '../client/api'

const lockCollection = 'payload-locked-documents'

// Payload's built-in document locking: a record in payload-locked-documents marks who is editing.
// Payload refuses REST updates from other users while the lock is fresh (5 minutes by default) and
// removes the document's locks after every successful save, so the editor takes the lock again after
// each save, refreshes it every minute, and removes it when leaving.
export function useDocumentLock({
  collection,
  id,
  userID,
  lockedByOther: initiallyLocked,
}: {
  collection: string
  id?: number
  userID: number
  lockedByOther: boolean
}) {
  const [lockedByOther, setLockedByOther] = useState(initiallyLocked)
  const lock = useRef<string | number | undefined>(undefined)
  const active = useRef(false)

  const acquire = useCallback(async () => {
    if (!id || !active.current) return
    try {
      const { doc } = await api<{ doc: { id: string | number } }>(lockCollection, {
        method: 'POST',
        json: { document: { relationTo: collection, value: id }, globalSlug: null, user: { relationTo: 'users', value: userID } },
      })
      if (active.current) lock.current = doc.id
      else release(doc.id)
    } catch {
      lock.current = undefined
    }
  }, [collection, id, userID])

  useEffect(() => {
    if (!id || lockedByOther) return
    active.current = true
    acquire()
    const heartbeat = setInterval(() => {
      const current = lock.current
      if (current === undefined) return void acquire()
      api(`${lockCollection}/${current}`, { method: 'PATCH', json: {} }).catch(() => {
        lock.current = undefined
        acquire()
      })
    }, 60_000)
    const leave = () => {
      if (lock.current !== undefined) release(lock.current)
    }
    window.addEventListener('pagehide', leave)
    return () => {
      active.current = false
      clearInterval(heartbeat)
      window.removeEventListener('pagehide', leave)
      leave()
      lock.current = undefined
    }
  }, [acquire, id, lockedByOther])

  // Call after each successful save: Payload has removed the lock by then.
  const relock = useCallback(() => {
    lock.current = undefined
    return acquire()
  }, [acquire])

  const takeOver = useCallback(async () => {
    if (!id) return
    const { docs } = await api<{ docs: { id: string | number }[] }>(
      lockCollection +
        query({
          'where[document.relationTo][equals]': collection,
          'where[document.value][equals]': id,
          depth: 0,
          limit: 10,
        }),
    )
    await Promise.all(docs.map((doc) => api(`${lockCollection}/${doc.id}`, { method: 'DELETE' })))
    setLockedByOther(false)
  }, [collection, id])

  return { lockedByOther, takeOver, relock }
}

function release(id: string | number) {
  fetch(`/api/${lockCollection}/${id}`, { method: 'DELETE', credentials: 'same-origin', keepalive: true }).catch(() => undefined)
}
