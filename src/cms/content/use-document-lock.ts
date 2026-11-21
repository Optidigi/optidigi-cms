'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, query } from '../client/api'

const lockCollection = 'payload-locked-documents'

// Payload's built-in document locking: a record in payload-locked-documents marks who is editing.
// Payload refuses REST updates from other users while the lock is fresh (5 minutes by default),
// so the editor refreshes it every minute and removes it when leaving.
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

  useEffect(() => {
    if (!id || lockedByOther) return
    let lock: string | number | undefined
    let cancelled = false
    api<{ doc: { id: string | number } }>(lockCollection, {
      method: 'POST',
      json: { document: { relationTo: collection, value: id }, globalSlug: null, user: { relationTo: 'users', value: userID } },
    }).then(
      ({ doc }) => {
        lock = doc.id
        if (cancelled) release()
      },
      () => undefined,
    )
    const heartbeat = setInterval(() => {
      if (lock !== undefined) api(`${lockCollection}/${lock}`, { method: 'PATCH', json: {} }).catch(() => undefined)
    }, 60_000)
    function release() {
      if (lock !== undefined) {
        fetch(`/api/${lockCollection}/${lock}`, { method: 'DELETE', credentials: 'same-origin', keepalive: true }).catch(() => undefined)
      }
    }
    window.addEventListener('pagehide', release)
    return () => {
      cancelled = true
      clearInterval(heartbeat)
      window.removeEventListener('pagehide', release)
      release()
    }
  }, [collection, id, userID, lockedByOther])

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

  return { lockedByOther, takeOver }
}
