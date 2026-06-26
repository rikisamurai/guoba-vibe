import {
  Outlet,
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { Toaster } from 'sonner'

import { AppShell } from '@/app/app-shell'
import { CollectionsPage } from '@/app/collections-page'
import { ImportExportPage } from '@/app/import-export-page'
import { QrDetailPage } from '@/app/qr-detail-page'
import { SharePage } from '@/app/share-page'
import { WorkspacePage } from '@/app/workspace-page'
import { parseWorkspaceFilterSearch, workspaceFilterSearch } from '@/app/workspace/workspace-filter'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster position="top-center" />
    </>
  ),
})

const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_shell',
  component: AppShell,
})

const indexRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>) =>
    workspaceFilterSearch(parseWorkspaceFilterSearch(search)),
  component: WorkspacePage,
})

const collectionsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/collections',
  component: CollectionsPage,
})

const collectionDetailRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/collections/$collectionId',
  component: CollectionsPage,
})

const qrDetailRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/q/$qrId',
  validateSearch: (search: Record<string, unknown>) =>
    workspaceFilterSearch(parseWorkspaceFilterSearch(search)),
  component: QrDetailPage,
})

const newRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/new',
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === 'string' ? search.url : '',
    title: typeof search.title === 'string' ? search.title : '',
    description: typeof search.description === 'string' ? search.description : '',
    ...workspaceFilterSearch(parseWorkspaceFilterSearch(search)),
  }),
  component: QrDetailPage,
})

const importRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/import',
  component: ImportExportPage,
})

const shareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/share',
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === 'string' ? search.url : '',
    title: typeof search.title === 'string' ? search.title : '',
    description: typeof search.description === 'string' ? search.description : '',
  }),
  component: SharePage,
})

const routeTree = rootRoute.addChildren([
  shellRoute.addChildren([
    indexRoute,
    collectionsRoute,
    collectionDetailRoute,
    qrDetailRoute,
    newRoute,
    importRoute,
  ]),
  shareRoute,
])

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />
}
