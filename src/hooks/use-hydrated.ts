'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}
const hydrated = () => true
const server = () => false

export function useHydrated() {
  return useSyncExternalStore(subscribe, hydrated, server)
}
