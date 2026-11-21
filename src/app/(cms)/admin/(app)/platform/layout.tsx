import { requirePlatformAdmin } from '@/cms/server'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin()
  return children
}
