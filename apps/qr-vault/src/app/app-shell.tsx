import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Database, Download, FolderOpen, Plus, QrCode } from "lucide-react";
import { type ComponentType } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
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
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  search?: Record<string, string>;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Vault", icon: Database, exact: true },
  { to: "/collections", label: "Collections", icon: FolderOpen },
  { to: "/new", label: "New QR", icon: Plus, exact: true, search: { url: "" } },
  { to: "/import", label: "Import", icon: Download, exact: true },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = item.exact
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(item.to + "/");

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
        <Link to={item.to} search={item.search as never}>
          <item.icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppShell() {
  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="lg" tooltip="QR Vault">
                  <Link to="/">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <QrCode className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="font-semibold">QR Vault</span>
                      <span className="text-xs text-muted-foreground">Local deep-link store</span>
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
            <div className="flex items-center justify-between gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
              <span className="font-mono text-xs text-muted-foreground">v0.1.0</span>
              <ThemeToggle />
            </div>
            <div className="hidden group-data-[collapsible=icon]:flex justify-center">
              <ThemeToggle />
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
            <SidebarTrigger />
            <div aria-hidden className="h-4 w-px shrink-0 bg-border" />
            <span className="font-mono text-xs text-muted-foreground">qr-vault</span>
          </header>
          <div className="flex-1 overflow-auto p-5">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
