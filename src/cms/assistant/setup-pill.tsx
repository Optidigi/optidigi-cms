'use client'

import { ArrowUpIcon } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group'
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
  const pill = 'h-10 gap-2.5 rounded-full bg-background px-4 text-base font-normal'
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
      <AvatarGroup className="-space-x-2">
        {shown.map((service) => (
          <Avatar key={service.id} size="sm" className="size-6">
            <AvatarFallback className="bg-background text-foreground">
              <ServiceLogo service={service} className="size-3.5" />
            </AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
    </Badge>
  )
}

// The prompt greyed out, so administrators see where they'll type once a model is connected. Where
// the model picker will be, a button leads to the AI settings.
export function DisabledPrompt({ site, className, textareaClassName }: { site: number; className?: string; textareaClassName?: string }) {
  const { t } = useI18n()
  return (
    <InputGroup className={cn('rounded-xl bg-background', className)}>
      <InputGroupTextarea aria-label={t('askAI')} placeholder={t('connectModelFirst')} className={cn('min-h-20 p-3 text-base md:text-base', textareaClassName)} disabled />
      <InputGroupAddon align="block-end">
        <Link href={`/admin/${site}/settings/ai`} className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-muted-foreground' })}>
          {t('noModelConnect')}
        </Link>
        <InputGroupButton size="icon-sm" variant="default" className="ml-auto rounded-full" aria-label={t('send')} disabled>
          <ArrowUpIcon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
