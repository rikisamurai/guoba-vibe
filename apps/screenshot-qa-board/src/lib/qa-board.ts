export type QaStatus = 'open' | 'fixed' | 'accepted'
export type QaSeverity = 'high' | 'medium' | 'low'

export type QaCard = {
  id: string
  title: string
  status: QaStatus
  severity: QaSeverity
  route?: string
  viewport?: string
  note?: string
  beforeImage?: string
  afterImage?: string
}

export function summarizeBoard(cards: QaCard[]) {
  return {
    total: cards.length,
    open: countByStatus(cards, 'open'),
    fixed: countByStatus(cards, 'fixed'),
    accepted: countByStatus(cards, 'accepted'),
    highSeverityOpen: cards.filter((card) => card.status === 'open' && card.severity === 'high')
      .length,
  }
}

export function transitionCardStatus(cards: QaCard[], id: string, status: QaStatus): QaCard[] {
  return cards.map((card) => (card.id === id ? { ...card, status } : card))
}

export function createQaCard(
  title: string,
  severity: QaSeverity,
  route: string,
  viewport: string,
): QaCard {
  return {
    id: slugify(title),
    title,
    status: 'open',
    severity,
    route,
    viewport,
    note: '',
    beforeImage: '',
    afterImage: '',
  }
}

export function buildReviewChecklist(cards: QaCard[]) {
  return cards
    .map((card) => `- [${card.status === 'accepted' ? 'x' : ' '}] ${card.severity} / ${card.title}`)
    .join('\n')
}

export function parseQaCards(payload: string): QaCard[] | null {
  try {
    const parsed = JSON.parse(payload)
    return Array.isArray(parsed) && parsed.every(isQaCard) ? parsed : null
  } catch {
    return null
  }
}

function countByStatus(cards: QaCard[], status: QaStatus) {
  return cards.filter((card) => card.status === status).length
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function isQaCard(value: unknown): value is QaCard {
  if (!value || typeof value !== 'object') {
    return false
  }

  const card = value as QaCard
  return (
    typeof card.id === 'string' &&
    typeof card.title === 'string' &&
    ['open', 'fixed', 'accepted'].includes(card.status) &&
    ['high', 'medium', 'low'].includes(card.severity)
  )
}
