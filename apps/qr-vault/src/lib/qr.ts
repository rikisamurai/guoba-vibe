import QRCode from 'qrcode'

export async function renderQrDataUrl(data: string, width = 512): Promise<string> {
  if (!data.trim()) throw new Error('renderQrDataUrl: data is required')

  return QRCode.toDataURL(data, {
    width,
    margin: 2,
    errorCorrectionLevel: 'M',
  })
}
