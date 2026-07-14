import { ExternalLink, FileCode2, GitBranch } from 'lucide-react'
import type { ComponentProps } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type { SkillFileContent, SkillRecord } from '../../../shared/types'
import type { InspectorTab } from '../ui-types'

export function InspectorContent({
  skill,
  tab,
  file,
  onReadFile,
}: {
  skill: SkillRecord
  tab: InspectorTab
  file?: SkillFileContent
  onReadFile: (id: string, path: string) => void
}) {
  if (tab === 'content') {
    return (
      <article className="markdown">
        <ReactMarkdown components={{ a: SafeMarkdownLink }} remarkPlugins={[remarkGfm]}>
          {withoutFrontmatter(skill.content)}
        </ReactMarkdown>
      </article>
    )
  }
  if (tab === 'files') return <FileBrowser file={file} onReadFile={onReadFile} skill={skill} />
  return <SourceDetails skill={skill} />
}

function FileBrowser({
  skill,
  file,
  onReadFile,
}: {
  skill: SkillRecord
  file?: SkillFileContent
  onReadFile: (id: string, path: string) => void
}) {
  const visibleFile = file?.skillId === skill.id ? file : undefined
  return (
    <div className="file-browser">
      <div className="file-list">
        {skill.files.map((path) => (
          <button key={path} onClick={() => onReadFile(skill.id, path)} type="button">
            <FileCode2 size={15} />
            <span>{path}</span>
            {path === 'SKILL.md' ? <em>entry</em> : null}
          </button>
        ))}
      </div>
      <pre className="file-preview" data-testid="file-preview">
        {visibleFile?.content ?? 'Select a file to inspect its contents.'}
      </pre>
    </div>
  )
}

function SafeMarkdownLink({ children, href, title }: ComponentProps<'a'>) {
  return (
    <a href={href} rel="noreferrer" target="_blank" title={title}>
      {children}
    </a>
  )
}

function SourceDetails({ skill }: { skill: SkillRecord }) {
  const source = skill.provenance
  if (!source) {
    return (
      <div className="source-empty">
        <GitBranch />
        <h3>No tracked source</h3>
        <p>This local Skill remains fully usable, but Guoba Skills cannot check it for updates.</p>
      </div>
    )
  }
  return (
    <dl className="source-grid">
      <Row label="Source" value={source.source} />
      <Row label="Branch" value={source.branch ?? source.requestedRef ?? 'captured default'} />
      <Row label="Revision" mono value={source.revision?.slice(0, 16) ?? 'legacy lock'} />
      <Row label="Skill path" mono value={source.skillPath} />
      <Row
        label="Content hash"
        mono
        value={source.contentHash?.slice(0, 23) ?? source.computedHash?.slice(0, 16) ?? 'unknown'}
      />
      <Row
        label="Checked"
        value={
          source.lastChecked?.at
            ? new Date(source.lastChecked.at).toLocaleString()
            : 'Not checked yet'
        }
      />
      {source.catalog ? (
        <a href={source.catalog.detailUrl} rel="noreferrer" target="_blank">
          Open on skills.sh <ExternalLink size={13} />
        </a>
      ) : null}
    </dl>
  )
}

function Row({ label, mono, value }: { label: string; mono?: boolean; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : ''}>{value}</dd>
    </div>
  )
}

function withoutFrontmatter(value: string): string {
  return value.replace(/^---\n[\s\S]*?\n---\n?/u, '').trim()
}
