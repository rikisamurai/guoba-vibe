import { AlertCircle, Database, Download, FolderOpen, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AppBrand, AppFrame } from '@/app/app-frame'
import { RecoveryPage } from '@/app/recovery/recovery-page'
import type { ReadyVault, RecoveringVault } from '@/app/vault/vault-open'
import { LanguageToggle } from '@/components/language-toggle'
import { SidebarMenuButton, SidebarMenuItem } from '@/components/shadcn-ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'

type RecoveryShellProps = Readonly<{
  recovery: RecoveringVault
  onReady: (ready: ReadyVault) => void
}>

export function RecoveryShell({ recovery, onReady }: RecoveryShellProps) {
  const { t } = useTranslation()
  return (
    <AppFrame
      brand={
        <div aria-label={t('app.brand')}>
          <AppBrand />
        </div>
      }
      brandTooltip={false}
      navigation={<RecoveryNavigation />}
      footerActions={
        <>
          <LanguageToggle />
          <ThemeToggle />
        </>
      }
      headerLabel={t('recovery.headerLabel')}
    >
      <RecoveryPage recovery={recovery} onReady={onReady} />
    </AppFrame>
  )
}

function RecoveryNavigation() {
  const { t } = useTranslation()
  const disabledItems = [
    ['nav.vault', Database],
    ['nav.collections', FolderOpen],
    ['nav.newQr', Plus],
    ['nav.import', Download],
  ] as const

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive>
          <div aria-current="page" aria-label={t('nav.recovery')} title={t('nav.recovery')}>
            <AlertCircle />
            <span>{t('nav.recovery')}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {disabledItems.map(([labelKey, Icon]) => (
        <SidebarMenuItem key={labelKey}>
          <SidebarMenuButton disabled aria-disabled="true" tooltip={t(labelKey)}>
            <Icon />
            <span>{t(labelKey)}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  )
}
