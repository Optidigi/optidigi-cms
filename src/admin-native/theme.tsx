'use client'

import { useLayoutEffect, useSyncExternalStore, type ReactNode } from 'react'
import './native.css'

// The launcher changes this tab's preference through a full navigation.
const subscribeToPage = () => () => {}

function isTweaked() {
  try {
    return sessionStorage.getItem('optidigi:admin-appearance') === 'tweaked'
  } catch {
    return false
  }
}

export function useTweakedAppearance() {
  return useSyncExternalStore(subscribeToPage, isTweaked, () => false)
}

export function NativeAdminTheme({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    if (!isTweaked()) return
    document.documentElement.dataset.adminAppearance = 'tweaked'
    return () => {
      delete document.documentElement.dataset.adminAppearance
    }
  }, [])

  return children
}
