import { describe, expect, it } from 'vitest'

import { buildQrDetailSource } from '@/app/qr-detail/qr-detail-source'
import type { QrView } from '@/app/vault/vault-types'

const qr = (id: string): QrView => ({
  id,
  title: 'Example',
  url: 'xhsdiscover://rn/page?mode=RN',
  createdAt: '1',
  updatedAt: '1',
  collectionIds: [],
  collectionTitles: [],
})

describe('buildQrDetailSource', () => {
  it('keeps the source revision stable when derived query-row ids are regenerated', () => {
    const first = buildQrDetailSource(qr('same'), {})
    const second = buildQrDetailSource(qr('same'), {})

    expect(second.revision).toBe(first.revision)
  })

  it('changes the source revision when navigating to another QR with equal fields', () => {
    expect(buildQrDetailSource(qr('a'), {}).revision).not.toBe(
      buildQrDetailSource(qr('b'), {}).revision,
    )
  })

  it('changes the source revision after the persisted QR is saved', () => {
    const saved = { ...qr('same'), updatedAt: '2' }

    expect(buildQrDetailSource(qr('same'), {}).revision).not.toBe(
      buildQrDetailSource(saved, {}).revision,
    )
  })
})
