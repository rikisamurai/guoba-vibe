import { useEffect, useMemo, useState } from 'react'

import { samples } from './diff-samples'
import type { DiffCase } from './lib/api-diff'
import { createDiffCase, maxDiffCases, parseDiffCases, validateCaseDraft } from './lib/diff-cases'

const storageKey = 'api-diff-lab-cases-v1'

export function useCaseLibrary() {
  const [initial] = useState(readInitialState)
  const [cases, setCases] = useState<DiffCase[]>(initial.cases)
  const [before, setBefore] = useState(initial.cases[0].before)
  const [after, setAfter] = useState(initial.cases[0].after)
  const [activeId, setActiveId] = useState(initial.cases[0].id)
  const [label, setLabel] = useState(initial.cases[0].label)
  const [payload, setPayload] = useState(initial.payload)
  const [message, setMessage] = useState(initial.message)
  const [storageError, setStorageError] = useState(initial.storageError)
  const [storageBlocked, setStorageBlocked] = useState(initial.storageBlocked)
  const [storageDirty, setStorageDirty] = useState(false)
  const activeCase = cases.find((item) => item.id === activeId) ?? cases[0]
  const dirty = useMemo(
    () =>
      before !== activeCase.before ||
      after !== activeCase.after ||
      label.trim() !== activeCase.label,
    [activeCase, after, before, label],
  )

  useEffect(() => {
    if (!storageBlocked) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(cases))
        setStorageError('')
        setStorageDirty(false)
      } catch {
        setStorageError('Local save failed. Export the library before leaving this page.')
        setStorageDirty(true)
      }
    }
  }, [cases, storageBlocked])

  useEffect(() => {
    const warnAboutDraft = (event: BeforeUnloadEvent) => {
      if (!dirty && !storageDirty) return
      event.preventDefault()
      event.returnValue = true
    }

    window.addEventListener('beforeunload', warnAboutDraft)
    return () => window.removeEventListener('beforeunload', warnAboutDraft)
  }, [dirty, storageDirty])

  function loadCase(diffCase: DiffCase) {
    setBefore(diffCase.before)
    setAfter(diffCase.after)
    setActiveId(diffCase.id)
    setLabel(diffCase.label)
  }

  function selectCase(id: string) {
    const selected = cases.find((item) => item.id === id)
    if (selected && confirmDraftDiscard()) loadCase(selected)
  }

  function resetCase() {
    if (confirmDraftDiscard()) {
      loadCase(activeCase)
      setMessage('Editor reset to the saved snapshot.')
    }
  }

  function saveCase() {
    if (storageBlocked) {
      setMessage('Resolve the invalid stored library before saving a snapshot.')
      return
    }

    const error = validateCaseDraft(label, before, after)
    if (error) {
      setMessage(error)
      return
    }
    if (cases.length >= maxDiffCases) {
      setMessage(`The library limit is ${maxDiffCases} snapshots. Delete or export before saving.`)
      return
    }

    const nextCase = createDiffCase(label, before, after)
    setStorageDirty(true)
    setCases((current) => [nextCase, ...current])
    loadCase(nextCase)
    setMessage('Snapshot saved. Existing snapshots were preserved.')
  }

  function deleteCase() {
    if (cases.length === 1) {
      setMessage('Keep at least one snapshot in the library.')
      return
    }
    const prompt = dirty
      ? `Delete “${activeCase.label}” and discard unsaved editor changes?`
      : `Delete “${activeCase.label}”?`
    if (!window.confirm(prompt)) return

    const nextCases = cases.filter((item) => item.id !== activeId)
    setStorageDirty(true)
    setCases(nextCases)
    loadCase(nextCases[0])
    setMessage('Snapshot deleted.')
  }

  function importCases() {
    const parsed = parseDiffCases(payload)
    if (!parsed) {
      setMessage('Import failed. Use 1–50 unique snapshots with valid JSON editors.')
      return
    }
    if (!confirmDraftDiscard()) return

    setCases(parsed)
    setStorageDirty(true)
    loadCase(parsed[0])
    setStorageBlocked(false)
    setStorageError('')
    setMessage(`${parsed.length} snapshots imported.`)
  }

  function resetLibrary() {
    if (!window.confirm('Discard the invalid stored library and restore the sample library?'))
      return
    setCases(samples)
    setStorageDirty(true)
    loadCase(samples[0])
    setPayload('')
    setStorageBlocked(false)
    setStorageError('')
    setMessage('Invalid storage replaced with the sample library.')
  }

  function confirmDraftDiscard() {
    return !dirty || window.confirm('Discard unsaved editor changes?')
  }

  return {
    cases,
    before,
    after,
    activeId,
    label,
    payload,
    message,
    storageError,
    storageBlocked,
    dirty,
    setBefore,
    setAfter,
    setLabel,
    setPayload,
    setMessage,
    selectCase,
    resetCase,
    saveCase,
    deleteCase,
    importCases,
    resetLibrary,
    exportCases: () => {
      setPayload(JSON.stringify(cases, null, 2))
      setMessage('Library exported into the transfer field.')
    },
  }
}

type InitialState = {
  cases: DiffCase[]
  payload: string
  message: string
  storageError: string
  storageBlocked: boolean
}

function readInitialState(): InitialState {
  const fallback = {
    cases: samples,
    payload: '',
    message: '',
    storageError: '',
    storageBlocked: false,
  }
  if (typeof window === 'undefined') return fallback

  try {
    const stored = window.localStorage.getItem(storageKey)
    if (stored === null) return fallback
    const parsed = parseDiffCases(stored)
    if (parsed) return { ...fallback, cases: parsed, message: 'Restored the local case library.' }
    return {
      ...fallback,
      payload: stored,
      storageBlocked: true,
      storageError:
        'Stored library failed validation and was left untouched. Repair it in transfer or reset it.',
    }
  } catch {
    return {
      ...fallback,
      storageError: 'Local storage is unavailable. Export to preserve changes.',
    }
  }
}
