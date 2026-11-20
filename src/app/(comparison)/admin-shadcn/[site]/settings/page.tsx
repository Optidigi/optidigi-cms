import Link from 'next/link'
import { ArrowRight, Globe2, Shield, Sparkles, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { adminRoot, currentSite } from '@/admin-comparison/data'
import { assistantMemberships } from '@/assistant/scope-shared'
import { isPlatformAdmin } from '@/site/access'

export default async function SettingsPage({ params }: { params: Promise<{ site: string }> }) {
  const { selected, req } = await currentSite((await params).site)
  const base = adminRoot + '/' + selected.id
  const member = assistantMemberships(req.user).find(({ id }) => id === selected.id)
  const rows = [
    {
      title: 'Website',
      description: 'Identiteit, contactgegevens, websitenavigatie en SEO per taal.',
      href: base + '/site-settings',
      Icon: Globe2,
    },
    ...(member
      ? [
          {
            title: 'AI-assistent',
            description: 'Bekijk de modelverbinding van deze website.',
            href: base + '/settings/assistant',
            Icon: Sparkles,
          },
        ]
      : []),
    {
      title: 'Mijn account',
      description: 'Beheer je e-mailadres, wachtwoord en weergave.',
      href: adminRoot + '/account',
      Icon: UserRound,
    },
    ...(isPlatformAdmin(req.user)
      ? [
          {
            title: 'Platformbeheer',
            description: 'Beheer websites, gebruikers en lidmaatschappen.',
            href: adminRoot + '/platform',
            Icon: Shield,
          },
        ]
      : []),
  ]
  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Instellingen</h1>
        <Badge variant="secondary" className="mt-2">
          {selected.name}
        </Badge>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map(({ title, description, href, Icon }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>
                <Icon className="mr-2 inline size-4" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href={href} />}
              >
                Open {title.toLowerCase()} <ArrowRight />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
