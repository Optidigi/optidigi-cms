'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function TweakedAdminPage() {
  useEffect(() => {
    try {
      const key = 'optidigi:admin-appearance'
      const reset = new URLSearchParams(location.search).get('style') === 'default'
      if (reset) sessionStorage.removeItem(key)
      else sessionStorage.setItem(key, 'tweaked')
    } catch {
      // Browsers with storage disabled can still use the native admin.
    }
    // Payload sends existing sessions to its dashboard and otherwise renders sign-in.
    location.replace('/admin/login')
  }, [])

  return <Link href="/admin/login">Open Payload</Link>
}
