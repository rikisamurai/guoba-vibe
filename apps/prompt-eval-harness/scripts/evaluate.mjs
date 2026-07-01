import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const suitePath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(appRoot, 'src/eval-suite.json')

const suite = JSON.parse(await readFile(suitePath, 'utf8'))
const scores = suite.attempts
  .map((attempt) => scoreAttempt(suite.rubric, attempt))
  .sort((left, right) => right.score - left.score)

console.log(`Prompt Eval Harness: ${suite.title}`)
console.log(`Suite: ${suitePath}`)
console.log('')
console.log('Task')
console.log(`  ${suite.task.prompt}`)
console.log('')
console.log('Expected outcome')
for (const item of suite.task.expectedOutcome) {
  console.log(`  - ${item}`)
}
console.log('')
console.log('Rubric')
for (const criterion of suite.rubric) {
  console.log(
    `  - ${criterion.label} (${Math.round(criterion.weight * 100)}%): ${criterion.description}`,
  )
}
console.log('')
console.log('Ranking')
scores.forEach((score, index) => {
  const attempt = suite.attempts.find((candidate) => candidate.id === score.id)
  console.log(`${index + 1}. ${score.title}: ${score.score} / 100 (${score.band})`)
  console.log(`   ${attempt.brief}`)
  for (const criterion of suite.rubric) {
    const rating = attempt.ratings[criterion.id] ?? 0
    const evidence = attempt.evidence[criterion.id] ?? 'No evidence recorded.'
    console.log(`   - ${criterion.label}: ${rating}/5 - ${evidence}`)
  }
})

function scoreAttempt(rubric, attempt) {
  const totalWeight = rubric.reduce((sum, criterion) => sum + criterion.weight, 0)
  const weightedScore = rubric.reduce((sum, criterion) => {
    const rating = attempt.ratings[criterion.id] ?? 0
    return sum + (rating / 5) * criterion.weight
  }, 0)
  const score = totalWeight === 0 ? 0 : Math.round((weightedScore / totalWeight) * 100)

  return {
    id: attempt.id,
    title: attempt.title,
    score,
    band: score >= 85 ? 'ship' : score >= 70 ? 'inspect' : 'hold',
  }
}
