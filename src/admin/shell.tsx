'use client'

import { useAdminTranslations, useEditingGuard } from '@/admin/i18n-context'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronsUpDown, Globe2, LayoutDashboard, Settings2, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
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
import { AdminHeader } from './header'
import { SettingsNavigation } from './settings-navigation'
import { AccountMenu } from './account-menu'
import { ShadcnAssistantLauncher, ShadcnAssistantProvider } from './assistant'
import { assistantSettingsHref, adminRoot, contentLinks, siteHref } from './navigation'
import type { AssistantContext, AssistantTenant } from '@/assistant/use-assistant'

type Website = { id: number; name: string }
type NavLink = { href: string; title: string; Icon: LucideIcon; active?: boolean }

export function AdminShell({
  sites,
  selected,
  assistant,
  platform,
  sidebarOpen,
  children,
}: {
  sites: Website[]
  selected?: Website
  assistant?: AssistantTenant
  platform?: boolean
  sidebarOpen?: boolean
  children: ReactNode
}) {
  const t = useAdminTranslations()

  const pathname = usePathname()
  const query = useSearchParams()
  const base = selected ? siteHref(selected.id) : adminRoot
  const section =
    pathname
      .slice(pathname === base || pathname.startsWith(base + '/') ? base.length : adminRoot.length)
      .split('/')[1] ?? ''
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
  const assistantRoute = !selected
    ? adminRoot
    : document
      ? base +
        '/assistant?document=' +
        document.id +
        '&locale=' +
        locale +
        (document.collection === 'pages' ? '' : '&collection=' + document.collection)
      : siteHref(selected.id, '/assistant', locale)
  const settingsRoot = selected ? siteHref(selected.id, '/settings') : adminRoot
  const settings = selected ? siteHref(selected.id, '/settings', locale) : adminRoot + '/account'
  const connection = selected && assistantSettingsHref(selected.id)
  const currentSection = [
    { slug: '', title: t('Overzicht') },
    ...contentLinks,
    { slug: 'assistant', title: t('AI-assistent') },
    { slug: 'settings', title: pathname === connection ? t('Modelverbinding') : t('Instellingen') },
    { slug: 'site-settings', title: t('Website-instellingen') },
    { slug: 'account', title: t('Mijn account') },
    { slug: 'platform', title: t('Platformbeheer') },
  ].find(({ slug }) => slug === section)
  const inSubsettings = section === 'site-settings' || pathname === connection
  const workspaceLinks = [
    { href: base, title: t('Overzicht'), Icon: LayoutDashboard, active: !section },
    ...(assistant
      ? [
          {
            href: assistantRoute,
            title: t('AI-assistent'),
            Icon: Sparkles,
            active: section === 'assistant',
          },
        ]
      : []),
  ]
  const settingsLinks = [
    {
      href: settings,
      title: t('Instellingen'),
      Icon: Settings2,
      active: pathname.startsWith(settingsRoot + '/') || pathname === settingsRoot,
    },
  ]
  const inSettings = ['settings', 'site-settings', 'account', 'platform'].includes(section)
  const shell = (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          {selected ? (
            <WebsiteSwitcher sites={sites} selected={selected} locale={locale} />
          ) : (
            <Link href={adminRoot} className="px-2 py-3 text-sm font-semibold">
              Optidigi CMS
            </Link>
          )}
        </SidebarHeader>
        <SidebarContent className="overflow-x-hidden">
          <nav aria-label="CMS" className="flex flex-col">
            <NavigationGroup title={t('Werkruimte')} links={workspaceLinks} />
            <NavigationGroup
              title={t('Inhoud')}
              links={
                selected
                  ? contentLinks.map(({ slug, ...link }) => ({
                      ...link,
                      href: siteHref(selected.id, '/' + slug, locale),
                      active: section === slug,
                    }))
                  : []
              }
            />
            <NavigationGroup title={t('Beheer')} links={settingsLinks} />
          </nav>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className={assistant && section !== 'assistant' ? 'min-w-0 pb-20' : 'min-w-0'}>
        <AdminHeader
          breadcrumbs={
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap">
                {section && (
                  <>
                    <BreadcrumbItem className="hidden min-w-0 sm:inline-flex">
                      <BreadcrumbLink className="max-w-40 truncate" render={<Link href={base} />}>
                        {selected?.name ?? 'Optidigi CMS'}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden sm:list-item" />
                  </>
                )}
                {inSubsettings && (
                  <>
                    <BreadcrumbItem className="hidden sm:inline-flex">
                      <BreadcrumbLink render={<Link href={settings} />}>
                        {t('Instellingen')}
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
          }
        >
          <AccountMenu website={selected?.id} platform={platform} />
        </AdminHeader>
        {inSettings ? (
          <div className="flex min-w-0 flex-1 flex-col lg:grid lg:grid-cols-[12rem_minmax(0,1fr)]">
            <SettingsNavigation site={selected} membership={assistant} platform={platform} />
            <div className="min-w-0">{children}</div>
          </div>
        ) : (
          children
        )}
        {assistant && section !== 'assistant' && <ShadcnAssistantLauncher route={assistantRoute} />}
      </SidebarInset>
    </SidebarProvider>
  )
  return assistant ? (
    <ShadcnAssistantProvider
      key={assistant.id}
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
  const t = useAdminTranslations()
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
        {t(title)}
      </SidebarGroupLabel>
      <SidebarMenu>
        {links.map((link) => (
          <NavigationItem key={link.href} {...link} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavigationItem({ href, title, Icon, active }: NavLink) {
  const t = useAdminTranslations()
  const { canNavigate } = useEditingGuard()
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={t(title)}
        render={
          <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            onNavigate={(event) => {
              if (
                !active &&
                !canNavigate(t('Je hebt niet-opgeslagen wijzigingen. Deze pagina toch verlaten?'))
              ) {
                event.preventDefault()
                return
              }
              setOpenMobile(false)
            }}
          />
        }
      >
        <Icon />
        <span>{t(title)}</span>
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
  const t = useAdminTranslations()

  const router = useRouter()
  const { canNavigate } = useEditingGuard()
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('Website kiezen: ') + selected.name}
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
                if (
                  !site ||
                  site.id === selected.id ||
                  !canNavigate(t('Je hebt niet-opgeslagen wijzigingen. Deze pagina toch verlaten?'))
                )
                  return
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
