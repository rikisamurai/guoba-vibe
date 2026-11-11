export interface NoteContext {
  prefix: string
  sha: string
  date: string
  repository: string
}
export function collectNotes(course: string, context: NoteContext): Promise<Map<string, string>>
