import type { PracticeCheck } from './checks'
import type { Implementation } from './types'

function harness(impl: Implementation) {
  const committed: string[] = []
  const started: string[] = []
  const pending = new Map<string, (output: string) => void>()
  const gate = impl.createTaskGate<string>(
    (source) => {
      started.push(source)
      return new Promise((resolve) => pending.set(source, resolve))
    },
    (output) => committed.push(output),
  )
  const settle = async (source: string) => {
    pending.get(source)?.(`${source} 的结果`)
    await Promise.resolve()
    await Promise.resolve()
  }
  return { committed, started, gate, settle }
}

export const gateChecks: PracticeCheck[] = [
  {
    id: 'gate-commit',
    group: 'gate',
    title: '唯一的任务完成后提交结果',
    file: 'task-gate.ts',
    input: 'push(“A”)，A 完成',
    expected: ['A 的结果'],
    async run(impl) {
      const test = harness(impl)
      test.gate.push('A')
      await test.settle('A')
      return test.committed
    },
  },
  {
    id: 'gate-stale',
    group: 'gate',
    title: '旧任务最后完成也不能覆盖新结果',
    file: 'task-gate.ts',
    input: 'push(“A”)、push(“B”)，B 先完成，A 后完成',
    expected: ['B 的结果'],
    async run(impl) {
      const test = harness(impl)
      test.gate.push('A')
      test.gate.push('B')
      await test.settle('B')
      await test.settle('A')
      return test.committed
    },
  },
  {
    id: 'gate-dispose',
    group: 'gate',
    title: '停止后返回的结果不再写回',
    file: 'task-gate.ts',
    input: 'push(“A”)、dispose()，随后 A 才完成',
    expected: [],
    async run(impl) {
      const test = harness(impl)
      test.gate.push('A')
      test.gate.dispose()
      await test.settle('A')
      return test.committed
    },
  },
  {
    id: 'gate-same',
    group: 'gate',
    title: '相同输入不重复启动任务',
    file: 'task-gate.ts',
    input: 'push(“A”)、push(“A”)',
    expected: ['A'],
    run(impl) {
      const test = harness(impl)
      test.gate.push('A')
      test.gate.push('A')
      return test.started
    },
  },
]
