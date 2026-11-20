import { SettingsWorkspace } from '@/admin/settings-workspace'
import { adminTranslations } from '@/admin/i18n-server'
import Link from 'next/link'
import { ChevronRight, Globe2, Shield, Sparkles, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'
import { currentSite } from '@/admin/data'
import { assistantSettingsHref, adminRoot, siteHref } from '@/admin/navigation'
import { assistantMemberships } from '@/assistant/scope-shared'
import { isPlatformAdmin } from '@/site/access'

type SettingsLink = { title: string; description: string; href: string; Icon: LucideIcon }

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>
  searchParams: Promise<{ locale?: string }>
}) {
  const t = await adminTranslations()

  const { selected, req } = await currentSite((await params).site)
  const locale = (await searchParams).locale === 'en' ? 'en' : 'nl'
  const member = assistantMemberships(req.user).find(({ id }) => id === selected.id)
  const websiteSettings = [
    {
      title: t('Website-instellingen'),
      description: t('Identiteit, contactgegevens, navigatie en SEO per taal.'),
      href: siteHref(selected.id, '/site-settings', locale),
      Icon: Globe2,
    },
    ...(member
      ? [
          {
            title: t('Modelverbinding'),
            description: member.canManage
              ? t('Verbind of wijzig het AI-model voor deze website.')
              : t('Bekijk welk AI-model voor deze website is ingesteld.'),
            href: assistantSettingsHref(selected.id),
            Icon: Sparkles,
          },
        ]
      : []),
  ]
  const account = {
    title: t('Mijn account'),
    description: t('Beheer je e-mailadres, wachtwoord en weergave.'),
    href: adminRoot + '/account?website=' + selected.id,
    Icon: UserRound,
  }
  const platform = {
    title: t('Platformbeheer'),
    description: t('Beheer websites, gebruikers en lidmaatschappen.'),
    href: adminRoot + '/platform?website=' + selected.id,
    Icon: Shield,
  }

  return (
    <SettingsWorkspace site={selected} current="overview" title={t('Instellingen')}>
      <SettingsGroup title={t('Deze website')} items={websiteSettings} />
      <SettingsGroup title={t('Persoonlijk')} items={[account]} />
      {isPlatformAdmin(req.user) && <SettingsGroup title={t('Platform')} items={[platform]} />}
    </SettingsWorkspace>
  )
}

function SettingsGroup({ title, items }: { title: string; items: SettingsLink[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map(({ title: name, description, href, Icon }) => (
            <li key={href}>
              <Item variant="outline" render={<Link href={href} />}>
                <ItemMedia variant="icon">
                  <Icon />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{name}</ItemTitle>
                  <ItemDescription>{description}</ItemDescription>
                </ItemContent>
                <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
              </Item>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
