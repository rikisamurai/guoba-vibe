import type { QaCard, QaSeverity, QaStatus } from './lib/qa-board'

export type ReviewCard = QaCard
export type SeverityFilter = QaSeverity | 'all'

const sharedCapture = {
  browser: 'Chrome 126',
  os: 'macOS 15',
  beforeImage: '',
  afterImage: '',
}

export const initialCards: ReviewCard[] = [
  {
    ...sharedCapture,
    id: 'sample-hero-overlap',
    title: 'Header action overlaps title',
    status: 'open',
    severity: 'high',
    route: '/pricing',
    viewport: '375 x 812',
    capturedAt: '2026-07-14T03:18:00.000Z',
    note: 'Primary CTA touches the title block in the first viewport.',
  },
  {
    ...sharedCapture,
    id: 'sample-mobile-crop',
    title: 'Mobile preview crops inspector',
    status: 'open',
    severity: 'low',
    route: '/inspect',
    viewport: '390 x 844',
    capturedAt: '2026-07-14T03:24:00.000Z',
    note: 'Inspector rail is usable, but the footer affordance is clipped.',
  },
  {
    ...sharedCapture,
    id: 'sample-button-wrap',
    title: 'Button text wraps at 375px',
    status: 'fixed',
    severity: 'medium',
    route: '/settings',
    viewport: '375 x 812',
    capturedAt: '2026-07-14T03:31:00.000Z',
    note: 'Retest shows the label now keeps a stable height.',
  },
  {
    ...sharedCapture,
    id: 'sample-dark-pass',
    title: 'Dark theme contrast accepted',
    status: 'accepted',
    severity: 'low',
    route: '/console',
    viewport: '1440 x 900',
    capturedAt: '2026-07-14T03:43:00.000Z',
    note: 'Contrast and spacing match the accepted reference shot.',
  },
]

export const statuses: QaStatus[] = ['open', 'fixed', 'accepted']
export const severities: SeverityFilter[] = ['all', 'high', 'medium', 'low']
