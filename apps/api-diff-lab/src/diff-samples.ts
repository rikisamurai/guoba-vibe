export type DiffSample = {
  id: string
  label: string
  before: string
  after: string
}

function stringify(value: unknown) {
  return JSON.stringify(value, null, 2)
}

export const samples: DiffSample[] = [
  {
    id: 'profile',
    label: 'Profile contract',
    before: stringify({ user: { id: 7, name: 'Riki' }, tags: ['qr'] }),
    after: stringify({ user: { id: '7', handle: 'riki' }, tags: ['qr'] }),
  },
  {
    id: 'money',
    label: 'Money payload',
    before: stringify({ coupon: { amountFen: 1200, currency: 'CNY' }, enabled: true }),
    after: stringify({ coupon: { amountYuan: '12.00', currency: 'CNY' }, enabled: true }),
  },
  {
    id: 'page',
    label: 'Page response',
    before: stringify({ data: { list: [], cursor: null }, success: true }),
    after: stringify({ data: { items: [], nextCursor: 'p2' }, ok: true }),
  },
  {
    id: 'line-items',
    label: 'Line item array',
    before: stringify({ items: [{ id: 7, price: 12, tags: ['new'] }] }),
    after: stringify({ items: [{ id: '7', amount: '12.00', tags: [1] }] }),
  },
]
