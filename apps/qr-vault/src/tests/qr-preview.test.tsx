import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { QrPreview } from '@/components/qr-preview'
import '@/i18n/i18n'

describe('QrPreview', () => {
  it('renders the inspector size as a compact preview', () => {
    const markup = renderToStaticMarkup(
      <QrPreview url="xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1" size="inspector" />,
    )

    expect(markup).toContain('min-height:500px')
    expect(markup).toContain('width:min(100%, 420px);aspect-ratio:1 / 1')
  })

  it('keeps the large preview size for focused QR pages', () => {
    const markup = renderToStaticMarkup(
      <QrPreview url="xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1" size="lg" />,
    )

    expect(markup).toContain('min-height:440px')
    expect(markup).toContain('width:min(100%, 380px);aspect-ratio:1 / 1')
  })
})
