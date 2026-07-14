import { Download, Upload } from 'lucide-react'
import type { ChangeEvent } from 'react'

import { exportJournal, parseJournal } from './lib/journal-storage'
import type { RunRecord } from './lib/run-journal'

type Notice = { kind: 'success' | 'error'; text: string }

export function JournalActions({
  runs,
  onImport,
  onNotice,
}: {
  runs: RunRecord[]
  onImport: (runs: RunRecord[]) => void
  onNotice: (notice: Notice) => void
}) {
  function download() {
    const url = URL.createObjectURL(new Blob([exportJournal(runs)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `run-journal-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    onNotice({ kind: 'success', text: `${runs.length} runs exported.` })
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    try {
      const imported = parseJournal(await file.text())
      if (!imported) {
        onNotice({
          kind: 'error',
          text: 'Import rejected: the journal schema or a link is invalid.',
        })
        return
      }
      onImport(imported)
      onNotice({ kind: 'success', text: `${imported.length} runs imported.` })
    } catch {
      onNotice({ kind: 'error', text: 'The selected file could not be read.' })
    } finally {
      input.value = ''
    }
  }

  return (
    <div className="journal-actions" aria-label="Journal data actions">
      <button type="button" onClick={download}>
        <Download size={15} aria-hidden="true" />
        Export
      </button>
      <label className="file-button">
        <Upload size={15} aria-hidden="true" />
        Import
        <input
          type="file"
          accept="application/json,.json"
          onChange={(event) => void importFile(event)}
        />
      </label>
    </div>
  )
}
