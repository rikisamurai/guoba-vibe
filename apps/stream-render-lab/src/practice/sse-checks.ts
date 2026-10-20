import type { PracticeCheck } from './checks'

export const sseChecks: PracticeCheck[] = [
  {
    id: 'sse-split',
    group: 'sse',
    title: '半条事件暂存，两条事件拆开',
    file: 'parse-events.ts',
    expected: [[], ['一', '二']],
    run(impl) {
      const parser = impl.createEventParser()
      return [parser.push('data: 一\n'), parser.push('\ndata: 二\n\n')]
    },
  },
  {
    // A trailing CR may be the first half of CRLF; ending the line early splits one event in two.
    id: 'sse-crlf',
    group: 'sse',
    title: 'CRLF 跨读取边界不提前结束行',
    file: 'parse-events.ts',
    expected: ['一\n二'],
    run(impl) {
      const parser = impl.createEventParser()
      return [
        ...parser.push('data: 一\r'),
        ...parser.push('\ndata: 二\r\n'),
        ...parser.push('\r\n'),
      ]
    },
  },
  {
    id: 'sse-cr',
    group: 'sse',
    title: '单独的 CR 也是行结束',
    file: 'parse-events.ts',
    expected: ['一\n二'],
    run(impl) {
      return impl.createEventParser().push('data: 一\rdata: 二\r\r: ping\r')
    },
  },
  {
    id: 'sse-fields',
    group: 'sse',
    title: '忽略注释，合并多行 data',
    file: 'parse-events.ts',
    expected: ['一\n二'],
    run(impl) {
      return impl.createEventParser().push(': ping\nevent: message\ndata: 一\ndata: 二\n\n')
    },
  },
  {
    id: 'sse-space',
    group: 'sse',
    title: '冒号后只去掉一个可选空格',
    file: 'parse-events.ts',
    expected: ['一\n 二'],
    run(impl) {
      return impl.createEventParser().push('data:一\ndata:  二\n\n')
    },
  },
  {
    id: 'sse-eof',
    group: 'sse',
    title: 'EOF 丢弃未由空行结束的事件',
    file: 'parse-events.ts',
    expected: [],
    run(impl) {
      const parser = impl.createEventParser()
      return [...parser.push('data: unfinished\n'), ...parser.finish()]
    },
  },
]
