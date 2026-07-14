import { Download, RotateCcw, Trash2, Upload } from 'lucide-react'

import { exportQaBoard, parseQaBoard, type QaCard } from './lib/qa-board'

export function BoardActions({
  cards,
  onImport,
  onReset,
  onClear,
  onError,
}: {
  cards: QaCard[]
  onImport: (cards: QaCard[]) => void
  onReset: () => void
  onClear: () => void
  onError: (message: string) => void
}) {
  async function importFile(file: File | undefined) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      onError('Board file exceeds 5MB and was not imported.')
      return
    }
    try {
      const result = parseQaBoard(await readTextFile(file))
      if (!result.ok) return onError(result.error)
      onImport(result.cards)
    } catch {
      onError('The board file could not be read.')
    }
  }

  return (
    <div className="board-actions" aria-label="Board data actions">
      <button type="button" onClick={() => downloadBoard(cards)}>
        <Download size={16} /> Export
      </button>
      <label className="button-like">
        <Upload size={16} /> Import
        <input
          aria-label="Import board JSON"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            void importFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </label>
      <button type="button" onClick={onReset}>
        <RotateCcw size={16} /> Reset demo
      </button>
      <button type="button" className="danger-action" onClick={onClear}>
        <Trash2 size={16} /> Clear
      </button>
    </div>
  )
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Board file did not contain text.'))
    })
    reader.addEventListener('error', () => reject(new Error('Board file could not be read.')))
    reader.readAsText(file)
  })
}

function downloadBoard(cards: QaCard[]) {
  const blob = new Blob([exportQaBoard(cards)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `screenshot-qa-board-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
