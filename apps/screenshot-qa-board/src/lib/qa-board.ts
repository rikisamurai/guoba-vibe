export type QaStatus = 'open' | 'fixed' | 'accepted'
export type QaSeverity = 'high' | 'medium' | 'low'

export type QaCard = {
  id: string
  title: string
  status: QaStatus
  severity: QaSeverity
  route: string
  viewport: string
  browser: string
  os: string
  capturedAt: string
  note: string
  beforeImage: string
  afterImage: string
}

export type QaCardDraft = Omit<QaCard, 'id' | 'status'>

export type BoardParseResult = { ok: true; cards: QaCard[] } | { ok: false; error: string }

const qaStatuses = new Set<string>(['open', 'fixed', 'accepted'])
const qaSeverities = new Set<string>(['high', 'medium', 'low'])

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

export function updateQaCard(cards: QaCard[], id: string, patch: Partial<QaCard>): QaCard[] {
  return cards.map((card) => (card.id === id ? { ...card, ...patch, id } : card))
}

export function createQaCard(draft: QaCardDraft): QaCard {
  const card = { ...draft, id: createId(), status: 'open' as const }
  if (!isQaCard(card)) {
    throw new Error('Complete every capture field and use valid screenshot URLs.')
  }
  return card
}

export function buildReviewChecklist(cards: QaCard[]) {
  return cards
    .map((card) => `- [${card.status === 'accepted' ? 'x' : ' '}] ${card.severity} / ${card.title}`)
    .join('\n')
}

export function exportQaBoard(cards: QaCard[]) {
  return JSON.stringify({ schemaVersion: 2, exportedAt: new Date().toISOString(), cards }, null, 2)
}

export function parseQaBoard(payload: string): BoardParseResult {
  try {
    const value: unknown = JSON.parse(payload)
    if (!value || typeof value !== 'object') {
      return { ok: false, error: 'The board file must be a JSON object.' }
    }
    if (!isRecord(value)) return { ok: false, error: 'The board file must be a JSON object.' }
    const board = value
    if (board.schemaVersion !== 2 || !Array.isArray(board.cards)) {
      return { ok: false, error: 'Unsupported board file. Expected schemaVersion 2.' }
    }
    return validateCards(board.cards)
  } catch {
    return { ok: false, error: 'The selected file is not valid JSON.' }
  }
}

export function parseStoredQaCards(payload: string): QaCard[] | null {
  try {
    const cards: unknown = JSON.parse(payload)
    if (!Array.isArray(cards)) return null
    const result = validateCards(cards)
    return result.ok ? result.cards : null
  } catch {
    return null
  }
}

export function isPersistableImageSource(value: string) {
  if (!value) return true
  if (/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(value)) return true
  if (/^(?:\.{0,2}\/|\/)/.test(value)) return !value.startsWith('//')
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validateCards(cards: unknown[]): BoardParseResult {
  if (!cards.every(isQaCard))
    return { ok: false, error: 'One or more issue records are malformed.' }
  const ids = cards.map((card) => card.id)
  if (new Set(ids).size !== ids.length) return { ok: false, error: 'Issue IDs must be unique.' }
  return { ok: true, cards }
}

function isQaCard(value: unknown): value is QaCard {
  if (!isRecord(value)) return false
  const card = value
  if (
    typeof card.id !== 'string' ||
    typeof card.title !== 'string' ||
    typeof card.route !== 'string' ||
    typeof card.viewport !== 'string' ||
    typeof card.browser !== 'string' ||
    typeof card.os !== 'string' ||
    typeof card.capturedAt !== 'string' ||
    typeof card.note !== 'string' ||
    typeof card.beforeImage !== 'string' ||
    typeof card.afterImage !== 'string' ||
    typeof card.status !== 'string' ||
    typeof card.severity !== 'string'
  )
    return false
  return (
    Boolean(
      card.id &&
      card.title.trim() &&
      card.route.trim() &&
      card.viewport.trim() &&
      card.browser.trim() &&
      card.os.trim(),
    ) &&
    qaStatuses.has(card.status) &&
    qaSeverities.has(card.severity) &&
    !Number.isNaN(Date.parse(card.capturedAt)) &&
    isPersistableImageSource(card.beforeImage) &&
    isPersistableImageSource(card.afterImage)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function countByStatus(cards: QaCard[], status: QaStatus) {
  return cards.filter((card) => card.status === status).length
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `qa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
