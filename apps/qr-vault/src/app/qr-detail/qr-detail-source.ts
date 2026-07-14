import type { QrDetailSearch } from '@/app/qr-detail/qr-detail-navigation'
import type { QrView } from '@/app/vault/vault-types'
import { parseDeepLink, queryToRows, type QueryRow } from '@/lib/url'

type QrDetailSource = {
  revision: string
  title: string
  description: string
  url: string
  queryRows: QueryRow[]
  collectionIds: string[]
}

export function buildQrDetailSource(
  qr: QrView | undefined,
  search: QrDetailSearch,
): QrDetailSource {
  const url = qr?.url ?? search.url ?? ''
  const source = {
    title: qr?.title ?? search.title ?? '',
    description: qr?.description ?? search.description ?? '',
    url,
    queryRows: qr?.queryParams?.map((row) => ({ ...row })) ?? queryToRows(parseDeepLink(url).query),
    collectionIds: qr ? [...qr.collectionIds] : [],
  }
  const revision = JSON.stringify({
    qrId: qr?.id,
    qrUpdatedAt: qr?.updatedAt,
    ...source,
    queryRows: source.queryRows.map((row) => ({
      id: qr?.queryParams ? row.id : undefined,
      key: row.key,
      value: row.value,
      enabled: row.enabled,
    })),
  })
  return { revision, ...source }
}
