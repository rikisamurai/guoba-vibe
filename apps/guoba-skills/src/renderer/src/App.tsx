import { useMemo, useState } from 'react'

import { DiffDialog } from './components/DiffDialog'
import { Inspector } from './components/Inspector'
import { InstallDialog } from './components/InstallDialog'
import { Sidebar } from './components/Sidebar'
import { SkillList } from './components/SkillList'
import type { SkillFilter } from './ui-types'
import { useSkills } from './use-skills'

export function App() {
  const skills = useSkills()
  const [filter, setFilter] = useState<SkillFilter>('all')
  const [query, setQuery] = useState('')
  const [installOpen, setInstallOpen] = useState(false)
  const selected = skills.inventory?.skills.find((skill) => skill.id === skills.selectedId)
  const visible = useMemo(() => {
    const value = query.trim().toLowerCase()
    return (skills.inventory?.skills ?? []).filter((skill) => {
      const filterMatches =
        filter === 'all' ||
        (filter === 'updates' && skill.updateStatus === 'update_available') ||
        (filter === 'attention' &&
          (skill.linkStatus !== 'healthy' ||
            ['local_modified', 'diverged', 'error'].includes(skill.updateStatus)))
      return (
        filterMatches &&
        (!value || `${skill.name} ${skill.description}`.toLowerCase().includes(value))
      )
    })
  }, [filter, query, skills.inventory])

  return (
    <main className="app-shell">
      <Sidebar
        filter={filter}
        inventory={skills.inventory}
        onChooseProject={() => void skills.chooseProject().catch(() => undefined)}
        onFilter={setFilter}
      />
      <SkillList
        busy={Boolean(skills.busy)}
        onAdd={() => setInstallOpen(true)}
        onCheck={() => void skills.check().catch(() => undefined)}
        onQuery={setQuery}
        onSelect={skills.setSelectedId}
        query={query}
        selectedId={skills.selectedId}
        skills={visible}
      />
      <Inspector
        onCheck={(id) => void skills.check(id).catch(() => undefined)}
        onMakeCanonical={(id) => void skills.makeCanonical(id).catch(() => undefined)}
        onPrepare={(id) => void skills.prepare(id).catch(() => undefined)}
        onSync={(id) => void skills.sync(id).catch(() => undefined)}
        skill={selected}
      />
      {skills.busy ? (
        <div className="busy-pill">
          <span />
          {skills.busy}
        </div>
      ) : null}
      {skills.error ? (
        <button className="error-toast" onClick={() => skills.setError(undefined)} type="button">
          <strong>Couldn’t complete that action</strong>
          <span>{skills.error}</span>
        </button>
      ) : null}
      {installOpen ? (
        <InstallDialog
          onClose={() => setInstallOpen(false)}
          onInstall={async (request) => {
            await skills.install(request)
            setInstallOpen(false)
          }}
        />
      ) : null}
      {skills.preview ? (
        <DiffDialog
          onApply={() => void skills.apply().catch(() => undefined)}
          onClose={() => skills.setPreview(undefined)}
          preview={skills.preview}
          unsafe={
            selected?.updateStatus === 'local_modified' || selected?.updateStatus === 'diverged'
          }
        />
      ) : null}
    </main>
  )
}
