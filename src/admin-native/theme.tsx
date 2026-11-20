'use client'

import Link from 'next/link'
import { useEffect, type ReactNode } from 'react'

const key = 'optidigi:admin-appearance'

export function TweakedAdminEntry() {
  useEffect(() => {
    try {
      const reset = new URLSearchParams(location.search).get('style') === 'default'
      if (reset) sessionStorage.removeItem(key)
      else sessionStorage.setItem(key, 'tweaked')
    } catch {
      // The normal appearance is available when session storage is disabled.
    } finally {
      location.replace('/admin')
    }
  }, [])

  return <Link href="/admin">Open Payload</Link>
}

export function NativeAdminTheme({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(key) === 'tweaked') {
        document.documentElement.dataset.adminAppearance = 'tweaked'
      }
    } catch {}
    return () => {
      delete document.documentElement.dataset.adminAppearance
    }
  }, [])

  return children
}
