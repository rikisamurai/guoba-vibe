import {
  Outlet,
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router'
import { Toaster } from 'sonner'

import { parseWorkspaceFilterSearch, workspaceFilterSearch } from '@/app/workspace/workspace-filter'

const LazyAppShell = lazyRouteComponent(() => import('@/app/app-shell'), 'AppShell')
const LazyCollectionsPage = lazyRouteComponent(
  () => import('@/app/collections-page'),
  'CollectionsPage',
)
const LazyImportExportPage = lazyRouteComponent(
  () => import('@/app/import-export-page'),
  'ImportExportPage',
)
const LazyQrDetailPage = lazyRouteComponent(() => import('@/app/qr-detail-page'), 'QrDetailPage')
const LazySharePage = lazyRouteComponent(() => import('@/app/share-page'), 'SharePage')
const LazyWorkspacePage = lazyRouteComponent(() => import('@/app/workspace-page'), 'WorkspacePage')

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
  component: LazyAppShell,
})

const indexRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>) =>
    workspaceFilterSearch(parseWorkspaceFilterSearch(search)),
  component: LazyWorkspacePage,
})

const collectionsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/collections',
  component: LazyCollectionsPage,
})

const collectionDetailRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/collections/$collectionId',
  component: LazyCollectionsPage,
})

const qrDetailRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/q/$qrId',
  validateSearch: (search: Record<string, unknown>) =>
    workspaceFilterSearch(parseWorkspaceFilterSearch(search)),
  component: LazyQrDetailPage,
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
  component: LazyQrDetailPage,
})

const importRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/import',
  component: LazyImportExportPage,
})

const shareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/share',
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === 'string' ? search.url : '',
    title: typeof search.title === 'string' ? search.title : '',
    description: typeof search.description === 'string' ? search.description : '',
  }),
  component: LazySharePage,
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
