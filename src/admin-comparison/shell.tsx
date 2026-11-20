'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  BriefcaseBusiness,
  ExternalLink,
  FileText,
  Globe2,
  Images,
  LayoutDashboard,
  Newspaper,
  Settings2,
  Shield,
  Sparkles,
  UserRound,
} from 'lucide-react'
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
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { ChevronsUpDown } from 'lucide-react'
import { ShadcnAssistantLauncher, ShadcnAssistantProvider } from './assistant'
import { AppearanceMenu } from './theme'
import type { AssistantContext, AssistantTenant } from '@/assistant/use-assistant'

type Website = { id: number; name: string; siteOrigin: string }
const root = '/admin-shadcn'
const links = [
  { slug: '', title: 'Overzicht', Icon: LayoutDashboard },
  { slug: 'pages', title: 'Pagina’s', Icon: FileText },
  { slug: 'articles', title: 'Artikelen', Icon: Newspaper },
  { slug: 'projects', title: 'Portfolio', Icon: BriefcaseBusiness },
  { slug: 'media', title: 'Media', Icon: Images },
  { slug: 'settings', title: 'Instellingen', Icon: Settings2 },
  { slug: 'assistant', title: 'AI-assistent', Icon: Sparkles },
]

export function ComparisonShell({
  sites,
  selected,
  assistant,
  platform,
  children,
}: {
  sites: Website[]
  selected: Website
  assistant?: AssistantTenant
  platform?: boolean
  children: ReactNode
}) {
  const pathname = usePathname()
  const query = useSearchParams()
  const base = root + '/' + selected.id
  const section = pathname.slice(base.length).split('/')[1] ?? ''
  const active = links.find(
    ({ slug }) => slug === (section === 'site-settings' ? 'settings' : section),
  )
  const onDocument = Number(query.get(active?.slug === 'assistant' ? 'document' : 'id'))
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
  const assistantRoute =
    base +
    '/assistant' +
    (document
      ? '?document=' +
        document.id +
        '&locale=' +
        locale +
        (document.collection === 'pages' ? '' : '&collection=' + document.collection)
      : locale === 'en'
        ? '?locale=en'
        : '')

  const shell = (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<SidebarMenuButton size="lg" tooltip={selected.name} />}
                >
                  <span className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
                    <Globe2 className="size-4" />
                  </span>
                  <span className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-medium">{selected.name}</span>
                    <span className="truncate text-xs text-muted-foreground">Optidigi CMS</span>
                  </span>
                  <ChevronsUpDown className="ms-auto" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-52">
                  {sites.map((site) => (
                    <DropdownMenuItem key={site.id} render={<Link href={root + '/' + site.id} />}>
                      {site.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Website</SidebarGroupLabel>
            <SidebarMenu>
              {links.map(({ slug, title, Icon }) => (
                <SidebarMenuItem key={slug}>
                  <SidebarMenuButton
                    isActive={active?.slug === slug}
                    tooltip={title}
                    render={
                      <Link
                        href={
                          slug === 'assistant' ? assistantRoute : base + (slug ? '/' + slug : '')
                        }
                      />
                    }
                  >
                    <Icon />
                    <span>{title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Mijn account" render={<Link href={root + '/account'} />}>
                <UserRound />
                <span>Mijn account</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {platform && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Platformbeheer"
                  render={<Link href={root + '/platform'} />}
                >
                  <Shield />
                  <span>Platformbeheer</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Open Payload" render={<Link href="/admin" />}>
                <ExternalLink />
                <span>Open Payload</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{active?.title ?? 'Website'}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-1">
            <AppearanceMenu />
            {active?.slug !== 'assistant' && <ShadcnAssistantLauncher route={assistantRoute} />}
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
