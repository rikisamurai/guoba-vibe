import type { PracticeCheck } from './checks'
import type { FrameClock } from './types'

function frameClock() {
  let next = 0
  const jobs = new Map<number, () => void>()
  const clock: FrameClock = {
    request(callback) {
      const id = ++next
      jobs.set(id, callback)
      return id
    },
    cancel(id) {
      jobs.delete(id)
    },
  }
  return {
    clock,
    tick() {
      const work = [...jobs.values()]
      jobs.clear()
      work.forEach((job) => job())
    },
  }
}
export const batchChecks: PracticeCheck[] = [
  {
    id: 'batch-frame',
    group: 'batch',
    title: '同一帧的多次输入只发布最新值',
    file: 'publish.ts',
    expected: ['你好！'],
    run(impl) {
      const output: string[] = []
      const time = frameClock()
      const publisher = impl.createPublisher((text) => output.push(text), time.clock)
      publisher.push('你')
      publisher.push('你好')
      publisher.push('你好！')
      time.tick()
      return output
    },
  },
  {
    id: 'batch-final',
    group: 'batch',
    title: '终态立即补齐最后一段，下一帧不重复',
    file: 'publish.ts',
    expected: ['最后一段'],
    run(impl) {
      const output: string[] = []
      const time = frameClock()
      const publisher = impl.createPublisher((text) => output.push(text), time.clock)
      publisher.push('最后一段')
      publisher.finish()
      time.tick()
      return output
    },
  },
  {
    id: 'batch-cancel',
    group: 'batch',
    title: '取消后旧帧不再发布',
    file: 'publish.ts',
    expected: [],
    run(impl) {
      const output: string[] = []
      const time = frameClock()
      const publisher = impl.createPublisher((text) => output.push(text), time.clock)
      publisher.push('过期内容')
      publisher.cancel()
      time.tick()
      return output
    },
  },
  {
    id: 'batch-next-frame',
    group: 'batch',
    title: '一帧发布后，后续输入申请新的帧',
    file: 'publish.ts',
    expected: ['你', '你好'],
    run(impl) {
      const output: string[] = []
      const time = frameClock()
      const publisher = impl.createPublisher((text) => output.push(text), time.clock)
      publisher.push('你')
      time.tick()
      publisher.push('你好')
      time.tick()
      return output
    },
  },
]
