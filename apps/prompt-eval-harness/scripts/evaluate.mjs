import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseEvalSuite } from '../src/lib/eval-validation.ts'
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
    console.error(`Prompt Eval Harness rejected ${suitePath}`)
    for (const error of parsed.errors) console.error(`  - ${error}`)
    return 1
  }

  printSuite(parsed.suite)
  return 0
}

function printSuite(suite) {
  const scores = scoreAttempts(suite.rubric, suite.attempts)

  console.log(`Prompt Eval Harness: ${suite.title}`)
  console.log(`Suite: ${suitePath}`)
  console.log('Mode: manual ratings with recorded evidence (candidate code is not executed)')
  console.log('')
  console.log('Task')
  console.log(`  ${suite.task.prompt}`)
  console.log('')
  console.log('Expected outcome')
  for (const item of suite.task.expectedOutcome) console.log(`  - ${item}`)
  console.log('')
  console.log('Rubric')
  for (const criterion of suite.rubric) {
    console.log(
      `  - ${criterion.label} (${Math.round(criterion.weight * 100)}%): ${criterion.description ?? ''}`,
    )
  }
  console.log('')
  console.log('Ranking')
  scores.forEach((score, index) => printAttempt(suite, score, index))
}

function printAttempt(suite, score, index) {
  const attempt = suite.attempts.find((candidate) => candidate.id === score.id)
  console.log(`${index + 1}. ${score.title}: ${score.score} / 100 (${score.band})`)
  console.log(`   ${attempt.brief}`)
  for (const criterion of suite.rubric) {
    console.log(
      `   - ${criterion.label}: ${attempt.ratings[criterion.id]}/5 - ${attempt.evidence[criterion.id]}`,
    )
  }
}

function readError(error) {
  return error instanceof Error ? error.message : String(error)
}
