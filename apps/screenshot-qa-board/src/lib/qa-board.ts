export type QaStatus = 'open' | 'fixed' | 'accepted'
export type QaSeverity = 'high' | 'medium' | 'low'

export type QaCard = {
  id: string
  title: string
  status: QaStatus
  severity: QaSeverity
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

function countByStatus(cards: QaCard[], status: QaStatus) {
  return cards.filter((card) => card.status === status).length
}
