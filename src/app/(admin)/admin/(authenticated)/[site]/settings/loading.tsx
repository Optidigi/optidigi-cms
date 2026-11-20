import { Skeleton } from '@/components/ui/skeleton'

export default function LoadingAdminContent() {
  return (
    <div aria-busy="true" className="grid gap-4 p-6">
      <Skeleton className="h-8 w-48 max-w-full" />
      <Skeleton className="h-52 w-full" />
    </div>
  )
}
