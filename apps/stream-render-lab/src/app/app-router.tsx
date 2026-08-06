import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { SiteShell } from './site-shell'

const HomePage = lazy(() => import('../pages/home-page'))
const LearnPage = lazy(() => import('../pages/learn-page'))
const LabPage = lazy(() => import('../pages/lab-page'))
const ProfilerPage = lazy(() => import('../pages/profiler-page'))
const ReproPage = lazy(() => import('../pages/repro-page'))
const ChatPage = lazy(() => import('../pages/chat-page'))
const BenchHostPage = lazy(() => import('../pages/bench-host-page'))

function RouteFallback() {
  return (
    <div className="route-fallback" role="status">
      <span className="route-fallback__dot" />
      正在装载实验记录…
    </div>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<SiteShell />}>
            <Route index element={<HomePage />} />
            <Route path="learn/:chapter" element={<LearnPage />} />
            <Route path="lab" element={<LabPage />} />
            <Route path="profiler" element={<ProfilerPage />} />
            <Route path="repro/:case" element={<ReproPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="bench" element={<BenchHostPage />} />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
