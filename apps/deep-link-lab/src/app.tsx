import { Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { initialUrl, profiles } from './deep-link-data'
import {
  buildEnvironmentLinks,
  exportWorkspace,
  importWorkspace,
  readDeepLinkParts,
  validateDeepLink,
} from './lib/deep-link-lab'
import { MatrixPanel } from './matrix-panel'
import { SourcePanel } from './source-panel'
import { WorkspaceActions } from './workspace-actions'

const storageKey = 'deep-link-lab-workspace-v1'

const sampleWorkspace = {
  name: 'Shopping launch links',
  sourceUrl: initialUrl,
  profiles,
}

function readInitialWorkspace() {
  if (typeof window === 'undefined') {
    return sampleWorkspace
  }

  const stored = window.localStorage.getItem(storageKey)
  return stored ? (importWorkspace(stored) ?? sampleWorkspace) : sampleWorkspace
}

export function App() {
  const initialWorkspace = useMemo(() => readInitialWorkspace(), [])
  const [workspaceName, setWorkspaceName] = useState(initialWorkspace.name)
  const [rawUrl, setRawUrl] = useState(initialWorkspace.sourceUrl)
  const [activeProfileId, setActiveProfileId] = useState(
    initialWorkspace.profiles[1]?.id ?? initialWorkspace.profiles[0].id,
  )
  const [profileDrafts, setProfileDrafts] = useState(initialWorkspace.profiles)
  const [copiedId, setCopiedId] = useState('')
  const [workspaceText, setWorkspaceText] = useState('')
  const [workspaceMessage, setWorkspaceMessage] = useState('')

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      exportWorkspace({ name: workspaceName, sourceUrl: rawUrl, profiles: profileDrafts }),
    )
  }, [profileDrafts, rawUrl, workspaceName])

  const result = useMemo(() => {
    const validation = validateDeepLink(rawUrl)

    if (validation.ok) {
      return {
        links: buildEnvironmentLinks(rawUrl, profileDrafts),
        parts: readDeepLinkParts(rawUrl),
        error: '',
      }
    }

    return { links: [], parts: null, error: validation.message }
  }, [profileDrafts, rawUrl])

  const activeLink = result.links.find((link) => link.id === activeProfileId) ?? result.links[0]
  const exportedWorkspace = exportWorkspace({
    name: workspaceName,
    sourceUrl: rawUrl,
    profiles: profileDrafts,
  })

  function applyWorkspaceImport() {
    const imported = importWorkspace(workspaceText)

    if (!imported) {
      setWorkspaceMessage('Import failed. Paste a valid Deep Link Lab workspace JSON.')
      return
    }

    setWorkspaceName(imported.name)
    setRawUrl(imported.sourceUrl)
    setProfileDrafts(imported.profiles)
    setActiveProfileId(imported.profiles[0].id)
    setWorkspaceMessage('Workspace imported.')
  }

  function restoreSampleWorkspace() {
    setWorkspaceName(sampleWorkspace.name)
    setRawUrl(sampleWorkspace.sourceUrl)
    setProfileDrafts(sampleWorkspace.profiles)
    setActiveProfileId(sampleWorkspace.profiles[1].id)
    setWorkspaceText('')
    setWorkspaceMessage('Sample workspace restored.')
  }

  return (
    <main className="shell">
      <section className="workspace" aria-label="Deep Link Lab workspace">
        <header className="topbar">
          <div>
            <p className="kicker">local matrix</p>
            <h1>Deep Link Lab</h1>
          </div>
          <div className="status-pill">
            <Check size={16} aria-hidden="true" />
            {result.error ? 'Needs URL' : `${result.links.length} targets`}
          </div>
        </header>

        <WorkspaceActions
          name={workspaceName}
          importText={workspaceText}
          exportText={exportedWorkspace}
          message={workspaceMessage}
          onNameChange={setWorkspaceName}
          onImportTextChange={setWorkspaceText}
          onExport={() => {
            setWorkspaceText(exportedWorkspace)
            setWorkspaceMessage('Workspace JSON is ready to copy.')
          }}
          onImport={applyWorkspaceImport}
          onReset={restoreSampleWorkspace}
        />

        <div className="layout">
          <SourcePanel
            rawUrl={rawUrl}
            parts={result.parts}
            profiles={profileDrafts}
            activeProfileId={activeProfileId}
            onRawUrlChange={setRawUrl}
            onActiveProfileChange={setActiveProfileId}
            onProfilesChange={setProfileDrafts}
          />
          <MatrixPanel
            error={result.error}
            links={result.links}
            activeLink={activeLink}
            activeProfileId={activeProfileId}
            copiedId={copiedId}
            onActiveProfileChange={setActiveProfileId}
            onCopiedChange={setCopiedId}
          />
        </div>
      </section>
    </main>
  )
}
