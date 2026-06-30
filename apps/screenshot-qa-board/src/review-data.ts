import type { QaCard, QaSeverity, QaStatus } from './lib/qa-board'

export type ReviewCard = QaCard & {
  route: string
  viewport: string
  note: string
}

export type SeverityFilter = QaSeverity | 'all'

export const initialCards: ReviewCard[] = [
  {
    id: 'hero-overlap',
    title: 'Header action overlaps title',
    status: 'open',
    severity: 'high',
    route: '/pricing',
    viewport: '375 x 812',
    note: 'Primary CTA touches the title block in the first viewport.',
  },
  {
    id: 'mobile-crop',
    title: 'Mobile preview crops inspector',
    status: 'open',
    severity: 'low',
    route: '/inspect',
    viewport: '390 x 844',
    note: 'Inspector rail is usable, but the footer affordance is clipped.',
  },
  {
    id: 'button-wrap',
    title: 'Button text wraps at 375px',
    status: 'fixed',
    severity: 'medium',
    route: '/settings',
    viewport: '375 x 812',
    note: 'Retest shows the label now keeps a stable height.',
  },
  {
    id: 'dark-pass',
    title: 'Dark theme contrast accepted',
    status: 'accepted',
    severity: 'low',
    route: '/console',
    viewport: '1440 x 900',
    note: 'Contrast and spacing match the accepted reference shot.',
  },
]

export const statuses: QaStatus[] = ['open', 'fixed', 'accepted']
export const severities: SeverityFilter[] = ['all', 'high', 'medium', 'low']
