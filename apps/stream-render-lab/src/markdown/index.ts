export { parseCanonical } from './canonical'
export {
  buildDefinitionDependencyIndex,
  changedDefinitions,
  planM3bUpdate,
  prefixDefinitionContext,
  targetedReferenceBlocks,
} from './m3b'
export { normalizeRenderIr } from './normalize'
export { parsePreview } from './preview'
export { repairPreview } from './repair'
export type {
  MarkdownDiagnostic,
  MarkdownDiagnosticCode,
  ParseWork,
  PreviewOptions,
  RenderBlock,
  RenderDocument,
  RenderNode,
  RenderPosition,
  RepairResult,
  SourceRange,
} from './types'
export type { DefinitionDependencyIndex, DefinitionRecord, M3bPlan, ReferenceRecord } from './m3b'
