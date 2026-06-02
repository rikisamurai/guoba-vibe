import QRCode from 'qrcode'

export async function renderQrDataUrl(data: string, width = 512): Promise<string> {
  if (!data.trim()) throw new Error('renderQrDataUrl: data is required')

  return QRCode.toDataURL(data, {
    width,
    margin: 2,
    errorCorrectionLevel: 'M',
  })
}

export function qrFileName(title?: string): string {
  const slug = (title ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `qr-${slug || 'untitled'}.png`
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}
