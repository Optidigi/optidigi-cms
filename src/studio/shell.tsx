import {
  ArrowUpRight,
  Briefcase,
  FileText,
  Globe2,
  Images,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { sections, type StudioSection } from './content'
import { studioRequest } from './data'
import { isPlatformAdmin } from '../site/access'
import { signOut } from './actions'
import { Button } from './ui/button'

const sectionIcons = {
  pages: FileText,
  articles: Newspaper,
  projects: Briefcase,
  media: Images,
  'site-settings': Settings2,
} satisfies Record<StudioSection, typeof FileText>

type Site = { id: number; name: string; siteOrigin: string }

export async function StudioShell({
  sites,
  active,
  children,
}: {
  sites: Site[]
  active?: number
  children: ReactNode
}) {
  const operator = isPlatformAdmin((await studioRequest()).user)
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="flex flex-col gap-5 border-b bg-card p-4 lg:min-h-dvh lg:border-r lg:border-b-0 lg:p-5">
        <Link href="/studio" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard aria-hidden="true" className="size-4" />
          </span>
          Optidigi Studio
        </Link>
        <nav aria-label="Websites" className="flex flex-wrap gap-1 lg:grid">
          {sites.map((site) => (
            <Button
              key={site.id}
              asChild
              variant={active === site.id ? 'secondary' : 'ghost'}
              className="justify-start"
            >
              <Link
                href={'/studio/' + site.id}
                aria-current={active === site.id ? 'page' : undefined}
              >
                <Globe2 aria-hidden="true" />
                {site.name}
              </Link>
            </Button>
          ))}
        </nav>
        {active && (
          <nav aria-label="Website-inhoud" className="flex flex-wrap gap-1 lg:grid">
            <Button asChild variant="ghost" className="justify-start">
              <Link href={'/studio/' + active + '/assistant'}>
                <Sparkles aria-hidden="true" /> Vraag AI
              </Link>
            </Button>
            {(Object.keys(sections) as StudioSection[]).map((slug) => {
              const Icon = sectionIcons[slug]
              return (
                <Button key={slug} asChild variant="ghost" className="justify-start">
                  <Link href={'/studio/' + active + '/content/' + slug}>
                    <Icon aria-hidden="true" /> {sections[slug]}
                  </Link>
                </Button>
              )
            })}
          </nav>
        )}
        <nav aria-label="Account" className="flex flex-wrap gap-1 lg:grid">
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/studio/account">
              <UserRound aria-hidden="true" /> Mijn account
            </Link>
          </Button>
          {operator && (
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/studio/administration">
                <ShieldCheck aria-hidden="true" /> Platformbeheer
              </Link>
            </Button>
          )}
        </nav>
        <div className="mt-auto flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/admin">
              <ArrowUpRight aria-hidden="true" />
              Payload
            </Link>
          </Button>
          <form action={signOut}>
            <Button variant="ghost" aria-label="Uitloggen">
              <LogOut aria-hidden="true" />
            </Button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 p-5 sm:p-8">{children}</main>
    </div>
  )
}
