import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const scriptPath = path.join(appRoot, 'scripts/evaluate.mjs')

describe('evaluate CLI', () => {
  it('exits non-zero before scoring an invalid rating', () => {
    const result = runCli(createSuite(99))

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('rating for Quality must be a finite number from 1 to 5')
    expect(result.stdout).not.toContain('Ranking')
  })

  it('prints a validated ranking and its manual-mode limitation', () => {
    const result = runCli(createSuite(5))

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Mode: manual ratings with recorded evidence')
    expect(result.stdout).toContain('Candidate: 100 / 100 (ship)')
  })

  it('neutralizes terminal control sequences and forged output lines', () => {
    const suite = createSuite(5)
    suite.title = '\u001B[2JCLI suite\nFORGED RANKING'
    suite.attempts[0].evidence.quality = '\u001B]8;;https://example.com\u0007Proof\u001B]8;;\u0007'

    const result = runCli(suite)

    expect(result.status).toBe(0)
    expect(result.stdout).not.toContain('\u001B')
    expect(result.stdout).not.toContain('\nFORGED RANKING')
    expect(result.stdout).toContain('CLI suite FORGED RANKING')
    expect(result.stdout).toContain('Proof')
  })
})

function runCli(suite) {
  const directory = mkdtempSync(path.join(tmpdir(), 'prompt-eval-'))
  const suitePath = path.join(directory, 'suite.json')
  writeFileSync(suitePath, JSON.stringify(suite))
  const result = spawnSync(process.execPath, [scriptPath, suitePath], {
    cwd: appRoot,
    encoding: 'utf8',
  })
  rmSync(directory, { recursive: true, force: true })
  return result
}

function createSuite(rating) {
  return {
    id: 'cli-suite',
    title: 'CLI suite',
    description: 'CLI contract test',
    task: { prompt: 'Review a patch', expectedOutcome: ['The patch is correct.'] },
    rubric: [{ id: 'quality', label: 'Quality', weight: 1 }],
    attempts: [
      {
        id: 'candidate',
        title: 'Candidate',
        brief: 'Focused candidate',
        output: 'Patch output',
        ratings: { quality: rating },
        evidence: { quality: 'Focused test passes.' },
      },
    ],
  }
}
