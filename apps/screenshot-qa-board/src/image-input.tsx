import { ImagePlus, Link2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { readImageFile } from './lib/image-files'
import { isPersistableImageSource } from './lib/qa-board'

export function ImageInput({
  label,
  source,
  onCommit,
  onError,
}: {
  label: string
  source: string
  onCommit: (source: string) => void
  onError: (message: string) => void
}) {
  const [draft, setDraft] = useState(source.startsWith('data:') ? '' : source)

  useEffect(() => {
    setDraft(source.startsWith('data:') ? '' : source)
  }, [source])

  function commitUrl() {
    const next = draft.trim()
    if (!isPersistableImageSource(next)) {
      onError('Use an http(s), relative, or embedded image URL.')
      return
    }
    onCommit(next)
  }

  async function upload(file: File | undefined) {
    if (!file) return
    try {
      onCommit(await readImageFile(file))
      setDraft('')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The image could not be loaded.')
    }
  }

  return (
    <div className="image-input">
      <span className="field-label">{label}</span>
      <div className="image-url-row">
        <input
          aria-label={`${label} image URL`}
          value={draft}
          placeholder="https://… or /screenshots/…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitUrl()
            }
          }}
        />
        <button type="button" onClick={commitUrl} aria-label={`Use ${label} image URL`}>
          <Link2 size={15} />
        </button>
      </div>
      <div className="image-input-actions">
        <label className="file-button">
          <ImagePlus size={15} /> Upload under 900KB
          <input
            aria-label={`Upload ${label} image`}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) => {
              void upload(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </label>
        {source && (
          <button type="button" className="clear-image" onClick={() => onCommit('')}>
            <X size={14} /> Remove
          </button>
        )}
      </div>
      <small>
        {source.startsWith('data:')
          ? 'Embedded image ready'
          : source
            ? 'Linked image ready'
            : 'No image attached'}
      </small>
    </div>
  )
}
