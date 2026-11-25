import * as mineDecoder from '../my-chat/decode'
import * as mineDirty from '../my-chat/dirty-start'
import * as mineParser from '../my-chat/parse-events'
import * as mineRepair from '../my-chat/preview-repair'
import * as minePublish from '../my-chat/publish'
import * as mineAnswer from '../my-chat/read-answer'
import * as mineEvent from '../my-chat/read-event'
import * as mineReuse from '../my-chat/reuse-blocks'
import * as mineGate from '../my-chat/task-gate'
import * as referenceDecoder from '../reference-chat/decode'
import * as referenceDirty from '../reference-chat/dirty-start'
import * as referenceParser from '../reference-chat/parse-events'
import * as referenceRepair from '../reference-chat/preview-repair'
import * as referencePublish from '../reference-chat/publish'
import * as referenceAnswer from '../reference-chat/read-answer'
import * as referenceEvent from '../reference-chat/read-event'
import * as referenceReuse from '../reference-chat/reuse-blocks'
import * as referenceGate from '../reference-chat/task-gate'
import type { Implementation } from './types'

export const implementations: Record<'mine' | 'reference', Implementation> = {
  mine: {
    ...mineDecoder,
    ...mineParser,
    ...mineEvent,
    ...mineAnswer,
    ...minePublish,
    ...mineRepair,
    ...mineReuse,
    ...mineDirty,
    ...mineGate,
  },
  reference: {
    ...referenceDecoder,
    ...referenceParser,
    ...referenceEvent,
    ...referenceAnswer,
    ...referencePublish,
    ...referenceRepair,
    ...referenceReuse,
    ...referenceDirty,
    ...referenceGate,
  },
}
