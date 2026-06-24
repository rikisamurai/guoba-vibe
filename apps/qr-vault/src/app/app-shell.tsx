import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { Database, Download, FolderOpen, HelpCircle, Plus, QrCode } from 'lucide-react'
import { type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { useOnboarding } from '@/app/onboarding/use-onboarding'
import { LanguageToggle } from '@/components/language-toggle'
import { Button } from '@/components/shadcn-ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/shadcn-ui/sidebar'
import { TooltipProvider } from '@/components/shadcn-ui/tooltip'
import { ThemeToggle } from '@/components/theme-toggle'

function OnboardingReplayButton() {
  const { restart } = useOnboarding()
  const { t } = useTranslation()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={restart}
      aria-label={t('common.replayOnboarding')}
      title={t('common.replayOnboarding')}
    >
      <HelpCircle />
    </Button>
  )
}

type NavItem = {
  to: string
  labelKey: string
  icon: ComponentType<{ className?: string }>
  exact?: boolean
  search?: Record<string, string>
  dataTour?: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.vault', icon: Database, exact: true },
  { to: '/collections', labelKey: 'nav.collections', icon: FolderOpen },
  {
    to: '/new',
    labelKey: 'nav.newQr',
    icon: Plus,
    exact: true,
    search: { url: '' },
    dataTour: 'nav-new-qr',
  },
  { to: '/import', labelKey: 'nav.import', icon: Download, exact: true },
]

function NavLink({ item }: { item: NavItem }) {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isActive = item.exact
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(item.to + '/')
  const label = t(item.labelKey)
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- TanStack Router types Link's search per-route; NavItem carries a generic search bag
  const search = item.search as never

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
        <Link
          to={item.to}
          search={search}
          {...(item.dataTour ? { 'data-tour': item.dataTour } : {})}
        >
          <item.icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppShell() {
  const { t } = useTranslation()

  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider>
        <Sidebar collapsible="icon" className="border-sidebar-border/80">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="lg" tooltip={t('app.brand')}>
                  <Link to="/">
                    <div className="scan-plate flex aspect-square size-8 items-center justify-center rounded-md border">
                      <QrCode className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="font-semibold">{t('app.brand')}</span>
                      <span className="text-muted-foreground text-xs">{t('app.subtitle')}</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => (
                    <NavLink key={item.to} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <div className="flex items-center justify-start gap-2 px-2 py-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
              <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col">
                <OnboardingReplayButton />
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="bg-transparent">
          <header className="bg-background/82 flex h-12 shrink-0 items-center gap-2 border-b px-3 backdrop-blur">
            <SidebarTrigger />
            <div aria-hidden className="bg-border h-4 w-px shrink-0" />
            <span className="text-muted-foreground font-mono text-xs">{t('app.shortName')}</span>
            <div aria-hidden className="signal-rule ml-auto h-px w-24" />
          </header>
          <div className="flex-1 overflow-auto p-4 sm:p-5">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
