import { Download, History, Upload } from 'lucide-react'
import type { ChangeEvent } from 'react'

import { exportJournal, parseJournal } from './lib/journal-storage'
import type { RunRecord } from './lib/run-journal'

type Notice = { kind: 'success' | 'error'; text: string }

export function JournalActions({
  runs,
  hasBackup,
  onImport,
  onRestore,
  onNotice,
}: {
  runs: RunRecord[]
  hasBackup: boolean
  onImport: (runs: RunRecord[]) => void
  onRestore: () => void
  onNotice: (notice: Notice) => void
}) {
  function download() {
    const url = URL.createObjectURL(new Blob([exportJournal(runs)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `run-journal-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
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
      if (
        window.confirm(
          `Replace the current journal with ${imported.length} imported runs? A restore point will be kept.`,
        )
      ) {
        onImport(imported)
      }
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
      {hasBackup ? (
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Restore the journal saved before the last import?')) onRestore()
          }}
        >
          <History size={15} aria-hidden="true" />
          Restore backup
        </button>
      ) : null}
    </div>
  )
}
