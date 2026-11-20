import type { ReactNode } from 'react'

// Adapted from the Next Shadcn Dashboard Starter PageContainer.
export function PageContainer({
  title,
  description,
  breadcrumb,
  action,
  children,
}: {
  title: string
  description?: string
  breadcrumb?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="@container mx-auto flex w-full min-w-0 max-w-screen-2xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div className="min-w-0">
          {breadcrumb}
          <h1 className="break-words text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="flex flex-wrap gap-2">{action}</div>}
      </header>
      {children}
    </section>
  )
}
