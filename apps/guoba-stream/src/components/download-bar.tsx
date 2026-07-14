import { Download } from 'lucide-react'

interface DownloadBarProps {
  total: number
  selectedCount: number
  onDownload: () => void
}

export function DownloadBar({ total, selectedCount, onDownload }: DownloadBarProps) {
  return (
    <div className="border-crust bg-coal/95 shadow-bar animate-rise fixed inset-x-0 bottom-0 z-10 border-t pb-[env(safe-area-inset-bottom)] motion-reduce:animate-none">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <span className="text-husk text-sm tabular-nums">
          {selectedCount} of {total} selected
        </span>
        <button
          type="button"
          onClick={onDownload}
          disabled={selectedCount === 0}
          className="bg-ember text-ember-ink hover:bg-ember-soft disabled:hover:bg-ember flex h-11 items-center gap-2 rounded-lg px-4 font-medium transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          <Download className="size-4" aria-hidden />
          Download {selectedCount} {selectedCount === 1 ? 'file' : 'files'}
        </button>
      </div>
    </div>
  )
}
