import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

import { formatWeightPercent, parseEvalSuite } from '../src/lib/eval-validation.ts'
import { scoreAttempts } from '../src/lib/prompt-eval.ts'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const suitePath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(appRoot, 'src/eval-suite.json')

process.exitCode = await main()

async function main() {
  let payload
  try {
    payload = await readFile(suitePath, 'utf8')
  } catch (error) {
    console.error(`Could not read suite: ${readError(error)}`)
    return 1
  }

  const parsed = parseEvalSuite(payload)
  if (!parsed.ok) {
    console.error(`Prompt Eval Harness rejected ${terminalText(suitePath)}`)
    for (const error of parsed.errors) console.error(`  - ${terminalText(error)}`)
    return 1
  }

  printSuite(parsed.suite)
  return 0
}

function printSuite(suite) {
  const scores = scoreAttempts(suite.rubric, suite.attempts)

  console.log(`Prompt Eval Harness: ${terminalText(suite.title)}`)
  console.log(`Suite: ${terminalText(suitePath)}`)
  console.log('Mode: manual ratings with recorded evidence (candidate code is not executed)')
  console.log('')
  console.log('Task')
  console.log(`  ${terminalText(suite.task.prompt)}`)
  console.log('')
  console.log('Expected outcome')
  for (const item of suite.task.expectedOutcome) console.log(`  - ${terminalText(item)}`)
  console.log('')
  console.log('Rubric')
  for (const criterion of suite.rubric) {
    console.log(
      `  - ${terminalText(criterion.label)} (${formatWeightPercent(criterion.weight)}): ${terminalText(criterion.description ?? '')}`,
    )
  }
  console.log('')
  console.log('Ranking')
  scores.forEach((score, index) => printAttempt(suite, score, index))
}

function printAttempt(suite, score, index) {
  const attempt = suite.attempts.find((candidate) => candidate.id === score.id)
  console.log(`${index + 1}. ${terminalText(score.title)}: ${score.score} / 100 (${score.band})`)
  console.log(`   ${terminalText(attempt.brief)}`)
  for (const criterion of suite.rubric) {
    console.log(
      `   - ${terminalText(criterion.label)}: ${attempt.ratings[criterion.id]}/5 - ${terminalText(attempt.evidence[criterion.id])}`,
    )
  }
}

function readError(error) {
  return terminalText(error instanceof Error ? error.message : String(error))
}

function terminalText(value) {
  const stripped = stripVTControlCharacters(String(value))
  return Array.from(stripped, (character) => {
    const code = character.codePointAt(0) ?? 0
    return code < 32 || (code >= 127 && code <= 159) ? ' ' : character
  })
    .join('')
    .replace(/\s+/gu, ' ')
    .trim()
}
