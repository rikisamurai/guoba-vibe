export const MANIFEST: string
export interface SyncReport {
  written: number
  removed: number
  unchanged: number
  manifestChanged: boolean
  source_sha?: string
}
export function syncNotes(
  target: string,
  notes: Map<string, string>,
  options?: { sha?: string; check?: boolean },
): Promise<SyncReport>
