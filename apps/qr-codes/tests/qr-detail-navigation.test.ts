import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('QR detail navigation', () => {
  it('uses the history-aware admin back affordance', async () => {
    const source = await fs.readFile(path.join(process.cwd(), 'src/app/q/[id]/page.tsx'), 'utf8')

    expect(source).toContain('BackToAdminLink')
  })

  it('keeps /admin as the fallback while preferring history back', async () => {
    const source = await fs.readFile(
      path.join(process.cwd(), 'src/components/back-to-admin-link.tsx'),
      'utf8',
    )

    expect(source).toContain('href="/admin"')
    expect(source).toContain('back();')
  })

  it('marks admin-origin QR card navigations for history back', async () => {
    const cardSource = await fs.readFile(
      path.join(process.cwd(), 'src/components/qr-card-link.tsx'),
      'utf8',
    )
    const adminSource = await fs.readFile(
      path.join(process.cwd(), 'src/app/(admin)/admin/page.tsx'),
      'utf8',
    )

    expect(cardSource).toContain('sessionStorage.setItem')
    expect(cardSource).toContain('returnHref')
    expect(adminSource).toContain('returnHref={adminHref}')
  })
})
