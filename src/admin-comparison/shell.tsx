'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronsUpDown,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  Plug,
  Settings2,
  Shield,
  Sparkles,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { ShadcnAssistantLauncher, ShadcnAssistantProvider } from './assistant'
import { AppearanceMenu } from './theme'
import { assistantSettingsHref, comparisonRoot, contentLinks, siteHref } from './navigation'
import type { AssistantContext, AssistantTenant } from '@/assistant/use-assistant'

type Website = { id: number; name: string }
type NavLink = { href: string; title: string; Icon: LucideIcon; active?: boolean }

export function ComparisonShell({
  sites,
  selected,
  assistant,
  platform,
  sidebarOpen,
  children,
}: {
  sites: Website[]
  selected: Website
  assistant?: AssistantTenant
  platform?: boolean
  sidebarOpen?: boolean
  children: ReactNode
}) {
  const pathname = usePathname()
  const query = useSearchParams()
  const base = siteHref(selected.id)
  const section = pathname.slice(base.length).split('/')[1] ?? ''
  const onDocument = Number(query.get(section === 'assistant' ? 'document' : 'id'))
  const candidate = section === 'assistant' ? (query.get('collection') ?? 'pages') : section
  const collection =
    candidate === 'pages' ||
    candidate === 'articles' ||
    candidate === 'projects' ||
    candidate === 'site-settings'
      ? candidate
      : undefined
  const document: AssistantContext | undefined =
    collection && Number.isSafeInteger(onDocument) && onDocument > 0
      ? { collection, id: onDocument }
      : undefined
  const locale = query.get('locale') === 'en' ? 'en' : 'nl'
  const assistantRoute = document
    ? base +
      '/assistant?document=' +
      document.id +
      '&locale=' +
      locale +
      (document.collection === 'pages' ? '' : '&collection=' + document.collection)
    : siteHref(selected.id, '/assistant', locale)
  const settingsRoot = siteHref(selected.id, '/settings')
  const settings = siteHref(selected.id, '/settings', locale)
  const connection = assistantSettingsHref(selected.id)
  const currentSection = [
    { slug: '', title: 'Overzicht' },
    ...contentLinks,
    { slug: 'assistant', title: 'AI-assistent' },
    { slug: 'settings', title: pathname === connection ? 'Modelverbinding' : 'Instellingen' },
    { slug: 'site-settings', title: 'Website-instellingen' },
  ].find(({ slug }) => slug === section)
  const inSubsettings = section === 'site-settings' || pathname === connection
  const workspaceLinks = [
    { href: base, title: 'Overzicht', Icon: LayoutDashboard, active: !section },
    ...(assistant
      ? [
          {
            href: assistantRoute,
            title: 'AI-assistent',
            Icon: Sparkles,
            active: section === 'assistant',
          },
        ]
      : []),
  ]
  const settingsLinks = [
    { href: settings, title: 'Instellingen', Icon: Settings2, active: pathname === settingsRoot },
    {
      href: siteHref(selected.id, '/site-settings', locale),
      title: 'Website-instellingen',
      Icon: Globe2,
      active: section === 'site-settings',
    },
    ...(assistant
      ? [
          {
            href: connection,
            title: 'Modelverbinding',
            Icon: Plug,
            active: pathname === connection,
          },
        ]
      : []),
  ]

  const shell = (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <WebsiteSwitcher sites={sites} selected={selected} locale={locale} />
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label="CMS" className="flex flex-col">
            <NavigationGroup title="Werkruimte" links={workspaceLinks} />
            <NavigationGroup
              title="Inhoud"
              links={contentLinks.map(({ slug, ...link }) => ({
                ...link,
                href: siteHref(selected.id, '/' + slug, locale),
                active: section === slug,
              }))}
            />
            <NavigationGroup title="Beheer" links={settingsLinks} />
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <NavigationItem
              href={comparisonRoot + '/account?website=' + selected.id}
              title="Mijn account"
              Icon={UserRound}
            />
            {platform && (
              <NavigationItem
                href={comparisonRoot + '/platform?website=' + selected.id}
                title="Platformbeheer"
                Icon={Shield}
              />
            )}
            <NavigationItem href="/admin" title="Open Payload" Icon={ExternalLink} />
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 rounded-t-[inherit] border-b bg-background px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" aria-label="Navigatie tonen of verbergen" />
            <Separator
              orientation="vertical"
              className="me-1 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap">
                {section && (
                  <>
                    <BreadcrumbItem className="hidden min-w-0 sm:inline-flex">
                      <BreadcrumbLink className="max-w-40 truncate" render={<Link href={base} />}>
                        {selected.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden sm:list-item" />
                  </>
                )}
                {inSubsettings && (
                  <>
                    <BreadcrumbItem className="hidden sm:inline-flex">
                      <BreadcrumbLink render={<Link href={settings} />}>
                        Instellingen
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden sm:list-item" />
                  </>
                )}
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate">
                    {currentSection?.title ?? 'Website'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <AppearanceMenu />
            {assistant && section !== 'assistant' && (
              <ShadcnAssistantLauncher route={assistantRoute} />
            )}
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
  return assistant ? (
    <ShadcnAssistantProvider
      key={selected.id}
      tenant={assistant}
      document={document}
      locale={locale}
    >
      {shell}
    </ShadcnAssistantProvider>
  ) : (
    shell
  )
}

function NavigationGroup({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {links.map((link) => (
          <NavigationItem key={link.href} {...link} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavigationItem({ href, title, Icon, active }: NavLink) {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={title}
        render={
          <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            onNavigate={() => setOpenMobile(false)}
          />
        }
      >
        <Icon />
        <span>{title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function WebsiteSwitcher({
  sites,
  selected,
  locale,
}: {
  sites: Website[]
  selected: Website
  locale: 'nl' | 'en'
}) {
  const router = useRouter()
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={'Website kiezen: ' + selected.name}
            render={<SidebarMenuButton size="lg" tooltip={selected.name} />}
          >
            <span className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
              <Globe2 className="size-4" />
            </span>
            <span className="grid min-w-0 flex-1 text-start text-sm leading-tight">
              <span className="truncate font-medium">{selected.name}</span>
              <span className="truncate text-xs text-muted-foreground">Optidigi CMS</span>
            </span>
            <ChevronsUpDown className="ms-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-w-[calc(100vw-2rem)] min-w-52">
            <DropdownMenuRadioGroup
              value={String(selected.id)}
              onValueChange={(value) => {
                const site = sites.find(({ id }) => String(id) === value)
                if (!site) return
                setOpenMobile(false)
                router.push(siteHref(site.id, '', locale))
              }}
            >
              {sites.map((site) => (
                <DropdownMenuRadioItem key={site.id} value={String(site.id)} closeOnClick>
                  <span className="truncate">{site.name}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
