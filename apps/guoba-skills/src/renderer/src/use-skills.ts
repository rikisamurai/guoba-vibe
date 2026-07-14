import { useCallback, useEffect, useState } from 'react'

import type { InstallRequest, Inventory, SkillFileContent, UpdatePreview } from '../../shared/types'
import { transport } from './transport'

export function useSkills() {
  const [inventory, setInventory] = useState<Inventory>()
  const [selectedId, setSelectedId] = useState<string>()
  const [preview, setPreview] = useState<UpdatePreview>()
  const [file, setFile] = useState<SkillFileContent>()
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()

  const acceptInventory = useCallback((next: Inventory) => {
    setInventory(next)
    setSelectedId((current) =>
      current && next.skills.some((skill) => skill.id === current) ? current : next.skills[0]?.id,
    )
  }, [])

  const run = useCallback(async <T>(label: string, action: () => Promise<T>): Promise<T> => {
    setBusy(label)
    setError(undefined)
    try {
      return await action()
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      setError(message)
      throw caught
    } finally {
      setBusy(undefined)
    }
  }, [])

  const reload = useCallback(async () => {
    const next = await run('Scanning Skills', () => transport.invoke<Inventory>('inventory'))
    acceptInventory(next)
  }, [acceptInventory, run])

  useEffect(() => {
    void reload().catch(() => undefined)
  }, [reload])

  const check = async (id?: string) => {
    const next = await run('Checking upstream revisions', () =>
      transport.invoke<Inventory>('check', { id }),
    )
    acceptInventory(next)
  }

  const sync = async (id?: string) => {
    const next = await run('Repairing Claude links', () =>
      transport.invoke<Inventory>('sync', { id }),
    )
    acceptInventory(next)
  }

  const prepare = async (id: string) => {
    const next = await run('Preparing exact revision', () =>
      transport.invoke<UpdatePreview>('prepare', { id }),
    )
    setPreview(next)
  }

  const apply = async () => {
    if (!preview) return
    const next = await run('Applying reviewed update', () =>
      transport.invoke<Inventory>('apply', { previewId: preview.previewId }),
    )
    setPreview(undefined)
    acceptInventory(next)
  }

  const discard = async () => {
    if (!preview) return
    const previewId = preview.previewId
    setPreview(undefined)
    await transport.invoke<void>('discard', { previewId })
  }

  const openFile = async (id: string, path: string) => {
    const next = await run('Reading Skill file', () =>
      transport.invoke<SkillFileContent>('readFile', { id, path }),
    )
    setFile(next)
  }

  const install = async (request: InstallRequest) => {
    const result = await run('Installing Skill', () =>
      transport.invoke<{ id: string; inventory: Inventory }>('install', request),
    )
    acceptInventory(result.inventory)
    setSelectedId(result.id)
  }

  const makeCanonical = async (id: string) => {
    const next = await run('Moving Skill into .agents', () =>
      transport.invoke<Inventory>('makeCanonical', { id }),
    )
    acceptInventory(next)
  }

  const chooseProject = async () => {
    const next = await run('Opening repository', () => transport.invoke<Inventory>('chooseProject'))
    acceptInventory(next)
  }

  return {
    inventory,
    selectedId,
    select: (id: string) => {
      setSelectedId(id)
      setFile(undefined)
    },
    preview,
    file,
    busy,
    error,
    setError,
    check,
    sync,
    prepare,
    discard,
    apply,
    openFile,
    install,
    makeCanonical,
    chooseProject,
  }
}
