import { Download } from 'lucide-react'

interface DownloadBarProps {
  total: number
  selectedCount: number
  onDownload: () => void
}

export function DownloadBar({ total, selectedCount, onDownload }: DownloadBarProps) {
  return (
    <div className="border-crust bg-coal/95 fixed inset-x-0 bottom-0 border-t pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <span className="text-husk text-sm">
          {selectedCount} of {total} selected
        </span>
        <button
          type="button"
          onClick={onDownload}
          disabled={selectedCount === 0}
          className="bg-ember text-ember-ink flex h-11 items-center gap-2 rounded-lg px-4 font-medium disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden />
          Download {selectedCount} {selectedCount === 1 ? 'file' : 'files'}
        </button>
      </div>
    </div>
  )
}
