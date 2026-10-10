export type BlockKind = 'markdown' | 'code' | 'mermaid'

export interface BlockFence {
  lang: string
  closed: boolean
}

export interface Block {
  /** `${messageId}:${seq}` — seq only ever grows, so React keys never collide. */
  id: string
  kind: BlockKind
  /** Original text slice. All block raws concatenated === the full text. */
  raw: string
  /** Once true the block object is frozen and never replaced — memo can skip it. */
  stable: boolean
  fence?: BlockFence
}

export interface SplitResult {
  blocks: Block[]
  /** Duration of the dirty-tail lex in this push, ms. */
  tailParseMs: number
  stableCount: number
}
