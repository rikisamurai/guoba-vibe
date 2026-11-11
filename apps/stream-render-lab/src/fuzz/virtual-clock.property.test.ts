import {
  array,
  assert as check,
  boolean,
  constantFrom,
  integer,
  property,
  record,
  type Arbitrary,
} from 'fast-check'
import { describe, expect, it } from 'vitest'

import { VirtualClock } from '../engine/clock'
import { PROPERTY_RUNS } from './property-helpers'

interface ScheduledCase {
  kind: 'frame' | 'timer'
  delay: number
  cancelled: boolean
}

const taskArbitrary: Arbitrary<ScheduledCase> = record({
  kind: constantFrom('frame', 'timer'),
  delay: integer({ min: 0, max: 80 }),
  cancelled: boolean(),
})

describe('VirtualClock scheduling properties', () => {
  it('orders equal deadlines by insertion and never executes cancelled work', () => {
    check(
      property(
        integer({ min: 1, max: 24 }),
        array(taskArbitrary, { minLength: 0, maxLength: 60 }),
        (frameDuration, tasks) => {
          const clock = new VirtualClock({ frameDuration })
          const actual: Array<{ index: number; time: number }> = []

          tasks.forEach((task, index) => {
            const run = () => actual.push({ index, time: clock.now() })
            const cancel = task.kind === 'frame' ? clock.frame(run) : clock.after(task.delay, run)
            if (task.cancelled) cancel()
          })

          clock.runUntilIdle()

          const expected = tasks
            .map((task, index) => ({
              index,
              time: task.kind === 'frame' ? frameDuration : task.delay,
              cancelled: task.cancelled,
            }))
            .filter((task) => !task.cancelled)
            .toSorted((left, right) => left.time - right.time || left.index - right.index)
            .map(({ index, time }) => ({ index, time }))

          expect(actual).toEqual(expected)
          expect(clock.pendingCount).toBe(0)
          expect(clock.now()).toBe(expected.at(-1)?.time ?? 0)
        },
      ),
      { seed: 0x51_00_05, numRuns: PROPERTY_RUNS },
    )
  })
})
