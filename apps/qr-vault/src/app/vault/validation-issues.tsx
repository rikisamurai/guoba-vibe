import { useTranslation } from 'react-i18next'

import type {
  VaultDocumentIssue,
  VaultIssueCode,
  VaultReceived,
} from '@/app/vault/vault-document-decoder'

const ISSUE_KEYS: Record<VaultIssueCode, string> = {
  'invalid-json': 'validation.invalidJson',
  'expected-object': 'validation.expectedObject',
  'expected-array': 'validation.expectedArray',
  'expected-string': 'validation.expectedString',
  'expected-boolean': 'validation.expectedBoolean',
  'expected-version-1': 'validation.expectedVersion',
}

const RECEIVED_KEYS: Record<VaultReceived, string> = {
  missing: 'validation.received.missing',
  'invalid-json': 'validation.received.invalidJson',
  null: 'validation.received.null',
  array: 'validation.received.array',
  object: 'validation.received.object',
  string: 'validation.received.string',
  number: 'validation.received.number',
  boolean: 'validation.received.boolean',
}

type ValidationIssuesProps = Readonly<{
  issues: readonly VaultDocumentIssue[]
  truncated: boolean
}>

export function ValidationIssues({ issues, truncated }: ValidationIssuesProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
        {t('validation.issuesLabel')}
      </p>
      <ol aria-label={t('validation.issuesLabel')} className="space-y-1.5">
        {issues.map((issue, index) => (
          <li
            key={`${issue.path}:${issue.code}:${index}`}
            className="bg-background/65 grid gap-1 rounded-md border px-3 py-2 sm:grid-cols-[minmax(10rem,0.7fr)_1fr] sm:items-baseline"
          >
            <code dir="ltr" className="text-destructive text-xs break-all">
              {issue.path}
            </code>
            <span className="text-muted-foreground text-xs">
              {t(ISSUE_KEYS[issue.code], { received: t(RECEIVED_KEYS[issue.received]) })}
            </span>
          </li>
        ))}
      </ol>
      {truncated && <p className="text-muted-foreground text-xs">{t('validation.truncated')}</p>}
    </div>
  )
}
