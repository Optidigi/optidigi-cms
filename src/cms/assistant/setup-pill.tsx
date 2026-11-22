'use client'

import { ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useI18n } from '../client/i18n-provider'
import { services } from '../settings/ai-services'
import { ServiceLogo } from '../settings/service-logo'

const shown = services.filter(({ group }) => group === 'direct')

// Shown while the website has no AI model: shadcn's link Badge as a small pill, with the services'
// logos in an AvatarGroup. Platform administrators go to the AI settings; members, who can't
// connect a model, only read that it isn't set up yet.
export function SetupPill({ site, platformAdmin, className }: { site: number; platformAdmin: boolean; className?: string }) {
  const { t } = useI18n()
  const pill = 'h-9 gap-2 rounded-full bg-background px-3.5 text-sm font-normal'
  if (!platformAdmin) {
    return (
      <Badge variant="outline" className={cn(pill, 'text-muted-foreground', className)}>
        {t('aiNotSetUpMember')}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className={cn(pill, 'hover:bg-muted', className)} render={<Link href={`/admin/${site}/settings/ai`} />}>
      {t('connectAModel')}
      <AvatarGroup className="-space-x-1.5">
        {shown.map((service) => (
          <Avatar key={service.id} size="sm" className="size-5">
            <AvatarFallback className="bg-background text-foreground">
              <ServiceLogo service={service} className="size-3" />
            </AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
      <ChevronRightIcon className="text-muted-foreground" />
    </Badge>
  )
}
