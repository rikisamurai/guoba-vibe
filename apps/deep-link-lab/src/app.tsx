import { CheckCircle2, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { sampleWorkspace } from './deep-link-data'
import {
  buildEnvironmentLinks,
  readDeepLinkParts,
  readOpenPolicy,
  validateDeepLink,
  type EnvironmentProfile,
} from './lib/deep-link-lab'
import {
  exportWorkspace,
  importWorkspace,
  validateWorkspace,
  type DeepLinkWorkspace,
} from './lib/workspace'
import { MatrixPanel } from './matrix-panel'
import { SourcePanel } from './source-panel'
import { WorkspaceActions } from './workspace-actions'

const storageKey = 'deep-link-lab-workspace-v2'

function readInitialWorkspace(): DeepLinkWorkspace {
  if (typeof window === 'undefined') return sampleWorkspace
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return sampleWorkspace
    const result = importWorkspace(stored)
    return result.ok ? result.workspace : sampleWorkspace
  } catch {
    return sampleWorkspace
  }
}

export function App() {
  const initialWorkspace = useMemo(readInitialWorkspace, [])
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const [activeProfileId, setActiveProfileId] = useState(
    initialWorkspace.profiles[1]?.id ?? initialWorkspace.profiles[0].id,
  )
  const [workspaceText, setWorkspaceText] = useState(() => exportWorkspace(initialWorkspace))
  const [workspaceMessage, setWorkspaceMessage] = useState('Workspace ready.')
  const [storageError, setStorageError] = useState('')

  useEffect(() => {
    const validation = validateWorkspace(workspace)
    if (!validation.ok) {
      setStorageError(`Draft not saved: ${validation.message}`)
      return
    }
    try {
      window.localStorage.setItem(storageKey, exportWorkspace(validation.workspace))
      setStorageError('')
    } catch {
      setStorageError('Autosave is unavailable in this browser.')
    }
  }, [workspace])

  const result = useMemo(() => {
    const validation = validateDeepLink(workspace.target)
    return {
      validation,
      openPolicy: readOpenPolicy(validation),
      links: validation.ok ? buildEnvironmentLinks(workspace.target, workspace.profiles) : [],
      parts: validation.ok ? readDeepLinkParts(workspace.target) : null,
    }
  }, [workspace.profiles, workspace.target])

  const activeLink = result.links.find((link) => link.id === activeProfileId) ?? result.links[0]

  function commitProfiles(profiles: EnvironmentProfile[], requestedActiveId?: string) {
    setWorkspace((current) => ({ ...current, profiles }))
    const nextActive = requestedActiveId ?? activeProfileId
    setActiveProfileId(
      profiles.some((profile) => profile.id === nextActive) ? nextActive : profiles[0].id,
    )
  }

  function applyWorkspaceImport() {
    const importResult = importWorkspace(workspaceText)
    if (!importResult.ok) {
      setWorkspaceMessage(importResult.message)
      return
    }
    setWorkspace(importResult.workspace)
    setActiveProfileId(importResult.workspace.profiles[0].id)
    setWorkspaceText(exportWorkspace(importResult.workspace))
    setWorkspaceMessage('Workspace imported and validated.')
  }

  function exportCurrentWorkspace() {
    const validation = validateWorkspace(workspace)
    if (!validation.ok) {
      setWorkspaceMessage(`Export blocked: ${validation.message}`)
      return
    }
    setWorkspaceText(exportWorkspace(validation.workspace))
    setWorkspaceMessage('Current workspace JSON is ready to copy.')
  }

  function restoreSampleWorkspace() {
    setWorkspace(sampleWorkspace)
    setActiveProfileId(sampleWorkspace.profiles[1]?.id ?? sampleWorkspace.profiles[0].id)
    setWorkspaceText(exportWorkspace(sampleWorkspace))
    setWorkspaceMessage('Sample workspace restored.')
  }

  return (
    <main className="shell">
      <section className="workspace" aria-label="Deep Link Lab workspace">
        <header className="topbar">
          <div className="brand-lockup">
            <span className="app-mark" aria-hidden="true">
              ↗
            </span>
            <div>
              <p className="kicker">URL compiler · local only</p>
              <h1>Deep Link Lab</h1>
            </div>
          </div>
          <div
            className={`status-pill ${
              !result.validation.ok ? 'invalid' : result.openPolicy.allowed ? 'valid' : 'caution'
            }`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {result.openPolicy.allowed ? (
              <CheckCircle2 size={16} aria-hidden="true" />
            ) : (
              <ShieldAlert size={16} aria-hidden="true" />
            )}
            {!result.validation.ok
              ? 'Target blocked'
              : result.openPolicy.allowed
                ? `${result.links.length} open-ready targets`
                : `${result.links.length} compiled · open blocked`}
          </div>
        </header>

        <WorkspaceActions
          name={workspace.name}
          importText={workspaceText}
          message={workspaceMessage}
          onNameChange={(name) => setWorkspace((current) => ({ ...current, name }))}
          onImportTextChange={setWorkspaceText}
          onExport={exportCurrentWorkspace}
          onImport={applyWorkspaceImport}
          onReset={restoreSampleWorkspace}
        />

        <div className="layout">
          <SourcePanel
            rawUrl={workspace.target}
            parts={result.parts}
            validationMessage={result.validation.message}
            profiles={workspace.profiles}
            activeProfileId={activeProfileId}
            onRawUrlChange={(target) => setWorkspace((current) => ({ ...current, target }))}
            onActiveProfileChange={setActiveProfileId}
            onProfilesCommit={commitProfiles}
            onFeedback={setWorkspaceMessage}
          />
          <MatrixPanel
            validation={result.validation}
            links={result.links}
            activeLink={activeLink}
            activeProfileId={activeProfileId}
            onActiveProfileChange={setActiveProfileId}
          />
        </div>

        <footer className="save-status" aria-live="polite">
          {storageError || 'Changes are saved locally in this browser.'}
        </footer>
      </section>
    </main>
  )
}
