import { Box, Text, useApp, useInput } from 'ink'
import { useEffect, useMemo, useState } from 'react'

import type { SkillManager } from '../core/skill-manager'
import type { Inventory, SkillRecord, UpdatePreview } from '../shared/types'

interface TuiProps {
  manager: SkillManager
}

export function Tui({ manager }: TuiProps) {
  const { exit } = useApp()
  const [inventory, setInventory] = useState<Inventory>()
  const [selected, setSelected] = useState(0)
  const [preview, setPreview] = useState<UpdatePreview>()
  const [message, setMessage] = useState('Scanning Project and User Skills…')
  const skills = inventory?.skills ?? []
  const skill = skills[selected]

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const next = await manager.inventory()
        setInventory(next)
        setMessage(`${next.skills.length} Skills · c check · u update · s sync · q quit`)
      } catch (error) {
        setMessage(errorMessage(error))
      }
    }
    void load()
  }, [manager])

  const run = async (action: () => Promise<Inventory>, pending: string) => {
    setMessage(pending)
    try {
      const next = await action()
      setInventory(next)
      setMessage('Done · c check · u update · s sync · q quit')
    } catch (error) {
      setMessage(errorMessage(error))
    }
  }

  useInput((input, key) => {
    if (input === 'q') {
      if (preview) void manager.discard(preview.previewId).finally(exit)
      else exit()
      return
    }
    if (key.upArrow) setSelected((value) => Math.max(0, value - 1))
    if (key.downArrow) setSelected((value) => Math.min(skills.length - 1, value + 1))
    if (key.escape && preview) {
      const previewId = preview.previewId
      setPreview(undefined)
      void manager.discard(previewId)
    }
    if (input === 'c' && skill) void run(() => manager.check(skill.id), `Checking ${skill.name}…`)
    if (input === 's' && skill) void run(() => manager.sync(skill.id), `Syncing ${skill.name}…`)
    if (input === 'u' && skill && !preview) {
      setMessage(`Preparing exact update for ${skill.name}…`)
      void manager
        .prepare(skill.id)
        .then(setPreview)
        .catch((error: unknown) => setMessage(errorMessage(error)))
    }
    if (input === 'y' && preview) {
      const previewId = preview.previewId
      setPreview(undefined)
      void run(() => manager.apply(previewId), 'Applying the reviewed update…')
    }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      <Header root={inventory?.projectRoot} />
      <Box marginTop={1}>
        <Box flexDirection="column" width={42}>
          {skills.map((item, index) => (
            <SkillRow key={item.id} active={index === selected} skill={item} />
          ))}
          {skills.length === 0 && inventory ? <Text dimColor>No Skills found.</Text> : null}
        </Box>
        <Box borderStyle="round" flexDirection="column" paddingX={1} width={72}>
          {preview ? <Preview preview={preview} /> : <Detail skill={skill} />}
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{message}</Text>
      </Box>
    </Box>
  )
}

function Header({ root }: { root?: string }) {
  return (
    <Box justifyContent="space-between">
      <Text bold color="#c7f464">
        Guoba Skills
      </Text>
      <Text dimColor>{root ?? 'User Skills'}</Text>
    </Box>
  )
}

function SkillRow({ active, skill }: { active: boolean; skill: SkillRecord }) {
  const mark =
    skill.updateStatus === 'update_available' ? '●' : skill.linkStatus === 'healthy' ? '✓' : '!'
  return (
    <Text backgroundColor={active ? '#293020' : undefined} color={active ? '#e8f6c5' : undefined}>
      {active ? '›' : ' '} {mark} {skill.name.slice(0, 25).padEnd(25)}{' '}
      {skill.scope === 'project' ? 'P' : 'U'}
    </Text>
  )
}

function Detail({ skill }: { skill?: SkillRecord }) {
  const excerpt = useMemo(() => skill?.content.split('\n').slice(0, 18).join('\n'), [skill])
  if (!skill) return <Text dimColor>Select a Skill.</Text>
  return (
    <>
      <Text bold>{skill.name}</Text>
      <Text dimColor>
        {skill.id} · {skill.updateStatus} · Claude {skill.linkStatus}
      </Text>
      <Box marginTop={1}>
        <Text>{excerpt}</Text>
      </Box>
    </>
  )
}

function Preview({ preview }: { preview: UpdatePreview }) {
  return (
    <>
      <Text bold color="#c7f464">
        Review update · {preview.changes.length} files
      </Text>
      <Text dimColor>{preview.remoteRevision.slice(0, 12)}</Text>
      <Box flexDirection="column" marginTop={1}>
        {preview.changes.map((change) => (
          <Box flexDirection="column" key={change.path}>
            <Text bold>
              {change.kind === 'added' ? '+' : change.kind === 'removed' ? '-' : '~'} {change.path}
            </Text>
            {previewLines(change.path, change.patch).map((item) => (
              <Text color={lineColor(item.line)} key={item.key}>
                {item.line}
              </Text>
            ))}
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color="#c7f464">y apply reviewed revision · esc cancel</Text>
      </Box>
    </>
  )
}

function lineColor(line: string): string | undefined {
  if (line.startsWith('+') && !line.startsWith('+++')) return '#9fe870'
  if (line.startsWith('-') && !line.startsWith('---')) return '#ff8f8f'
  return undefined
}

function previewLines(path: string, patch?: string): { key: string; line: string }[] {
  const occurrences = new Map<string, number>()
  return (patch?.split('\n') ?? []).map((line) => {
    const count = (occurrences.get(line) ?? 0) + 1
    occurrences.set(line, count)
    return { key: `${path}:${count}:${line}`, line }
  })
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
