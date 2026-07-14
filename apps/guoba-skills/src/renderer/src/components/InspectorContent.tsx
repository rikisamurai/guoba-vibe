import { ExternalLink, FileCode2, GitBranch } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type { SkillRecord } from '../../../shared/types'
import type { InspectorTab } from '../ui-types'

export function InspectorContent({ skill, tab }: { skill: SkillRecord; tab: InspectorTab }) {
  if (tab === 'content') {
    return (
      <article className="markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {withoutFrontmatter(skill.content)}
        </ReactMarkdown>
      </article>
    )
  }
  if (tab === 'files') return <FileList skill={skill} />
  return <SourceDetails skill={skill} />
}

function FileList({ skill }: { skill: SkillRecord }) {
  return (
    <div className="file-list">
      {skill.files.map((file) => (
        <div key={file}>
          <FileCode2 size={15} />
          <span>{file}</span>
          {file === 'SKILL.md' ? <em>entry</em> : null}
        </div>
      ))}
    </div>
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
