'use client'

import { useEffect, useState } from 'react'

export function PreviewFrame({ src }: { src: string }) {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const refresh = () => setRevision((previous) => previous + 1)
    window.addEventListener('optidigi:homepage-saved', refresh)
    return () => window.removeEventListener('optidigi:homepage-saved', refresh)
  }, [])
  return (
    <iframe
      key={revision}
      className="h-[32rem] w-full rounded-lg border bg-white"
      title="Homepagevoorbeeld"
      src={src}
      referrerPolicy="no-referrer"
    />
  )
}
