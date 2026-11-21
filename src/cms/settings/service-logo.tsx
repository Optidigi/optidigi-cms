import { ServerIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { aiLogos } from './ai-logos'
import type { Service } from './ai-services'

// A service's logo (static SVG data from ai-logos.ts), or a server icon for a custom service.
export function ServiceLogo({ service, className }: { service: Service; className?: string }) {
  const logo = aiLogos[service.id]
  if (!logo) return <ServerIcon aria-hidden className={cn('size-4 shrink-0', className)} />
  if (logo.kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element -- inline logo data
    return <img src={logo.src} alt="" aria-hidden className={cn('size-4 shrink-0 object-contain', className)} />
  }
  return <span aria-hidden className={cn('inline-flex size-4 shrink-0', className)} dangerouslySetInnerHTML={{ __html: logo.svg }} />
}

// The logo on a small tile, for cards and headers.
export function ServiceTile({ service, className }: { service: Service; className?: string }) {
  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-foreground', className)}>
      <ServiceLogo service={service} className="size-5" />
    </span>
  )
}
