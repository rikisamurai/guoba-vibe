import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { removeQueryParam, upsertQueryParam } from './lib/deep-link-lab'

export function QueryEditor({
  rawUrl,
  query,
  disabled,
  onRawUrlChange,
}: {
  rawUrl: string
  query: Array<{ key: string; value: string }>
  disabled: boolean
  onRawUrlChange: (url: string) => void
}) {
  const [newParam, setNewParam] = useState({ key: '', value: '' })
  const [message, setMessage] = useState('')

  function addParam() {
    const key = newParam.key.trim()
    if (!key) {
      setMessage('Parameter key is required.')
      return
    }
    if (query.some((param) => param.key === key)) {
      setMessage(`Parameter “${key}” already exists.`)
      return
    }
    onRawUrlChange(upsertQueryParam(rawUrl, key, newParam.value))
    setNewParam({ key: '', value: '' })
    setMessage('Source parameter added.')
  }

  return (
    <div className="query-editor" aria-label="Source query parameter editor">
      <div className="section-heading">
        <span>Source query</span>
        <small>{disabled ? 'Fix the target to edit' : `${query.length} parameters`}</small>
      </div>
      {query.map((param) => (
        <div className="query-row" key={param.key}>
          <input aria-label={`${param.key} key`} value={param.key} readOnly />
          <input
            aria-label={`${param.key} value`}
            value={param.value}
            disabled={disabled}
            onChange={(event) =>
              onRawUrlChange(upsertQueryParam(rawUrl, param.key, event.target.value))
            }
          />
          <button
            type="button"
            aria-label={`Remove ${param.key}`}
            disabled={disabled}
            onClick={() => onRawUrlChange(removeQueryParam(rawUrl, param.key))}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      ))}
      <form
        className="query-row add-row"
        onSubmit={(event) => {
          event.preventDefault()
          if (!disabled) addParam()
        }}
      >
        <input
          aria-label="New source query key"
          placeholder="key"
          disabled={disabled}
          value={newParam.key}
          onChange={(event) => setNewParam((current) => ({ ...current, key: event.target.value }))}
        />
        <input
          aria-label="New source query value"
          placeholder="value"
          disabled={disabled}
          value={newParam.value}
          onChange={(event) =>
            setNewParam((current) => ({ ...current, value: event.target.value }))
          }
        />
        <button type="submit" aria-label="Add source query parameter" disabled={disabled}>
          <Plus size={15} aria-hidden="true" />
        </button>
      </form>
      {message ? (
        <p className="inline-message" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  )
}
