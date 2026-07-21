import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { Database, Download, FolderOpen, HelpCircle, Plus } from 'lucide-react'
import { type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { AppBrand, AppFrame } from '@/app/app-frame'
import { useOnboarding } from '@/app/onboarding/use-onboarding'
import { LanguageToggle } from '@/components/language-toggle'
import { Button } from '@/components/shadcn-ui/button'
import { SidebarMenuButton, SidebarMenuItem } from '@/components/shadcn-ui/sidebar'
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
    <AppFrame
      brand={
        <Link to="/">
          <AppBrand />
        </Link>
      }
      navigation={NAV_ITEMS.map((item) => (
        <NavLink key={item.to} item={item} />
      ))}
      footerActions={
        <>
          <OnboardingReplayButton />
          <LanguageToggle />
          <ThemeToggle />
        </>
      }
      headerLabel={t('app.shortName')}
    >
      <Outlet />
    </AppFrame>
  )
}
