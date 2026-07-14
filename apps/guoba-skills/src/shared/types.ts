export type SkillScope = 'project' | 'user'

export type ClaudeLinkStatus =
  | 'healthy'
  | 'missing'
  | 'real_directory'
  | 'wrong_target'
  | 'claude_only'

export type UpdateStatus =
  | 'untracked'
  | 'local_only'
  | 'up_to_date'
  | 'update_available'
  | 'local_modified'
  | 'diverged'
  | 'source_missing'
  | 'auth_required'
  | 'error'

export interface CatalogReference {
  provider: 'skills.sh'
  id: string
  detailUrl: string
}

export interface LastChecked {
  at: string
  revision?: string
  treeHash?: string
  contentHash?: string
}

export interface SkillProvenance {
  source: string
  sourceType: 'github' | 'git' | 'local'
  skillPath: string
  computedHash?: string
  sourceUrl?: string
  branch?: string | null
  requestedRef?: string
  refPolicy?: 'explicit' | 'captured-default'
  revision?: string
  treeHash?: string
  contentHash?: string
  hashProfile?: 'guoba-skill-v1'
  catalog?: CatalogReference
  installedAt?: string
  updatedAt?: string
  lastChecked?: LastChecked
}

export interface SkillRecord {
  id: string
  name: string
  description: string
  scope: SkillScope
  location: 'canonical' | 'claude_only'
  canonicalPath: string
  claudePath: string
  linkStatus: ClaudeLinkStatus
  updateStatus: UpdateStatus
  content: string
  files: string[]
  provenance?: SkillProvenance
  error?: string
}

export interface Inventory {
  projectRoot?: string
  userHome: string
  skills: SkillRecord[]
  scannedAt: string
}

export interface FileChange {
  path: string
  kind: 'added' | 'removed' | 'modified'
  binary: boolean
  patch?: string
}

export interface UpdatePreview {
  previewId: string
  skillId: string
  baseContentHash: string
  remoteRevision: string
  remoteTreeHash: string
  remoteContentHash: string
  changes: FileChange[]
}

export interface InstallRequest {
  source: string
  scope: SkillScope
  skill?: string
  ref?: string
}

export type ServiceAction =
  | 'inventory'
  | 'check'
  | 'prepare'
  | 'apply'
  | 'sync'
  | 'install'
  | 'makeCanonical'
  | 'chooseProject'

export interface ServiceTransport {
  invoke<T>(action: ServiceAction, payload?: unknown): Promise<T>
}
