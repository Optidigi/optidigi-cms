'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// False during server rendering and hydration, true once React handles events on the client.
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false)
}
