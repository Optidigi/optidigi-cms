import { cn } from '@/lib/utils'

// One page container for every admin screen, so lists, media and settings line up.
export function PageBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:p-6', className)} {...props} />
}

export function PageTitle({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
