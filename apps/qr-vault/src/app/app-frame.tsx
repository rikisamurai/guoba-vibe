import { QrCode } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

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

type AppFrameProps = Readonly<{
  brand: ReactNode
  brandTooltip?: boolean
  navigation: ReactNode
  footerActions: ReactNode
  headerLabel: string
  children: ReactNode
}>

export function AppBrand() {
  const { t } = useTranslation()
  return (
    <>
      <div className="scan-plate flex aspect-square size-8 items-center justify-center rounded-md border">
        <QrCode className="size-4" />
      </div>
      <div className="grid flex-1 text-left leading-tight">
        <span className="font-semibold">{t('app.brand')}</span>
        <span className="text-muted-foreground text-xs">{t('app.subtitle')}</span>
      </div>
    </>
  )
}

export function AppFrame({
  brand,
  brandTooltip = true,
  navigation,
  footerActions,
  headerLabel,
  children,
}: AppFrameProps) {
  const { t } = useTranslation()
  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider>
        <Sidebar collapsible="icon" className="border-sidebar-border/80">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="lg"
                  tooltip={brandTooltip ? t('app.brand') : undefined}
                >
                  {brand}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>{navigation}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <div className="flex items-center justify-start gap-2 px-2 py-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
              <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col">
                {footerActions}
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="bg-transparent">
          <header className="bg-background/82 flex h-12 shrink-0 items-center gap-2 border-b px-3 backdrop-blur">
            <SidebarTrigger />
            <div aria-hidden className="bg-border h-4 w-px shrink-0" />
            <span className="text-muted-foreground font-mono text-xs">{headerLabel}</span>
            <div aria-hidden className="signal-rule ml-auto h-px w-24" />
          </header>
          <div className="flex-1 overflow-auto p-4 sm:p-5">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
