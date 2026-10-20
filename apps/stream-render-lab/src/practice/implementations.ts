import * as mineDecoder from '../my-chat/decode'
import * as mineParser from '../my-chat/parse-events'
import * as minePublish from '../my-chat/publish'
import * as mineAnswer from '../my-chat/read-answer'
import * as mineEvent from '../my-chat/read-event'
import * as referenceDecoder from '../reference-chat/decode'
import * as referenceParser from '../reference-chat/parse-events'
import * as referencePublish from '../reference-chat/publish'
import * as referenceAnswer from '../reference-chat/read-answer'
import * as referenceEvent from '../reference-chat/read-event'
import type { Implementation } from './types'

export const implementations: Record<'mine' | 'reference', Implementation> = {
  mine: { ...mineDecoder, ...mineParser, ...mineEvent, ...mineAnswer, ...minePublish },
  reference: {
    ...referenceDecoder,
    ...referenceParser,
    ...referenceEvent,
    ...referenceAnswer,
    ...referencePublish,
  },
}
