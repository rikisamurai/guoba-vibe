import {
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppShell } from "@/app/app-shell";
import { CollectionsPage } from "@/app/collections-page";
import { ImportExportPage } from "@/app/import-export-page";
import { QrDetailPage } from "@/app/qr-detail-page";
import { SharePage } from "@/app/share-page";
import { WorkspacePage } from "@/app/workspace-page";

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: WorkspacePage,
});

const collectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collections",
  component: CollectionsPage,
});

const collectionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collections/$collectionId",
  component: CollectionsPage,
});

const qrDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/q/$qrId",
  component: QrDetailPage,
});

const newRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/new",
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === "string" ? search.url : "",
  }),
  component: QrDetailPage,
});

const shareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/share",
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === "string" ? search.url : "",
    title: typeof search.title === "string" ? search.title : "",
    description: typeof search.description === "string" ? search.description : "",
  }),
  component: SharePage,
});

const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/import",
  component: ImportExportPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  collectionsRoute,
  collectionDetailRoute,
  qrDetailRoute,
  newRoute,
  shareRoute,
  importRoute,
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
