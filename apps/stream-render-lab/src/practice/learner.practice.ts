import { expect, it } from 'vitest'

import { practiceChecks } from './checks'
import { implementations } from './implementations'

const source = import.meta.env.VITE_PRACTICE_REFERENCE === '1' ? 'reference' : 'mine'
const group = import.meta.env.VITE_PRACTICE_GROUP
for (const check of practiceChecks.filter((item) => !group || item.group === group)) {
  it(`${source}: ${check.title} → src/${source === 'mine' ? 'my-chat' : 'reference-chat'}/${check.file}`, async () => {
    expect(await check.run(implementations[source])).toEqual(check.expected)
  })
}
