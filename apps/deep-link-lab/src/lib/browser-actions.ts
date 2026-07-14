import { readOpenPolicy, validateDeepLink } from './deep-link-lab'

export async function copyLink(url: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return { ok: true, message: 'Link copied to the clipboard.' }
    }
  } catch {
    // Continue to the selection-based fallback for restricted browser contexts.
  }

  const previousFocus = document.activeElement
  const textarea = document.createElement('textarea')
  textarea.value = url
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.setAttribute('aria-hidden', 'true')
  document.body.append(textarea)
  textarea.select()
  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  } finally {
    textarea.remove()
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
      previousFocus.focus({ preventScroll: true })
    }
  }
  return copied
    ? { ok: true, message: 'Link copied to the clipboard.' }
    : { ok: false, message: 'Copy failed. Select and copy the link manually.' }
}

export function openLink(url: string) {
  const validation = validateDeepLink(url)
  if (!validation.ok) return { ok: false, message: validation.message }
  const policy = readOpenPolicy(validation)
  if (!policy.allowed) return { ok: false, message: policy.message }

  try {
    if (validation.scheme === 'http' || validation.scheme === 'https') {
      const opened = window.open(url, '_blank')
      if (!opened) return { ok: false, message: 'Open was blocked by the browser.' }
      opened.opener = null
      return { ok: true, message: 'Link opened in a new tab.' }
    }

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.rel = 'noopener noreferrer'
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    return { ok: true, message: `Open request sent to the ${validation.scheme} app.` }
  } catch {
    return { ok: false, message: 'The browser could not dispatch this link.' }
  }
}
