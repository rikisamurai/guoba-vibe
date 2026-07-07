export function triggerDownload(href: string): void {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}

export async function downloadSequentially(hrefs: string[], delayMs = 500): Promise<void> {
  for (const [index, href] of hrefs.entries()) {
    // oxlint-disable-next-line no-await-in-loop -- sequential throttling is the point: spacing downloads dodges browser multi-download blocking
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
    triggerDownload(href)
  }
}
