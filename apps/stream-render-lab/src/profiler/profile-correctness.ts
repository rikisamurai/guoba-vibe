import type { RenderSnapshot } from '../engine/types'
import { normalizeRenderIr, parseCanonical } from '../markdown'
import type { ProfileRunSample } from './ab-types'

export function checkProfileCorrectness(
  snapshot: RenderSnapshot,
  expectedText: string,
): ProfileRunSample['correctness'] {
  const answers = snapshot.parts.filter((part) => part.kind === 'answer')
  const answer = answers[0]
  return {
    completed: snapshot.outcome?.kind === 'completed',
    raw: answers.length === 1 && answer?.raw === expectedText,
    visible: answers.length === 1 && answer?.visible === expectedText,
    canonical:
      answers.length === 1 &&
      !!answer &&
      JSON.stringify(normalizeRenderIr(answer.document)) ===
        JSON.stringify(normalizeRenderIr(parseCanonical(expectedText))),
  }
}
