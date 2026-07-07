'use client'

import { LogIn, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { getErrorMessage } from '@/lib/json'

export function LoginForm({ ready }: { ready: boolean }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const response = await fetch('/api/session', {
      body: JSON.stringify({ code }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const payload: unknown = await response.json().catch(() => null)

    setSubmitting(false)
    if (!response.ok) {
      setError(getErrorMessage(payload, '登录失败'))
      return
    }
    window.location.reload()
  }

  return (
    <div className="login-view">
      <header className="topbar">
        <div>
          <p className="eyebrow">Private</p>
          <h1>Video Link</h1>
        </div>
        <ShieldCheck aria-hidden="true" className="topbar-icon" />
      </header>

      <form className="login-panel" onSubmit={submit}>
        <label htmlFor="invite-code">邀请码</label>
        <input
          autoComplete="one-time-code"
          aria-label="邀请码"
          disabled={!ready || submitting}
          id="invite-code"
          onChange={(event) => setCode(event.target.value)}
          placeholder="输入邀请码"
          type="password"
          value={code}
        />
        <button
          className="primary-button"
          disabled={!ready || submitting || !code.trim()}
          type="submit"
        >
          <LogIn aria-hidden="true" />
          {submitting ? '登录中' : '进入'}
        </button>
        {!ready && <p className="error-text">服务端未配置邀请码</p>}
        {error && <p className="error-text">{error}</p>}
      </form>
    </div>
  )
}
