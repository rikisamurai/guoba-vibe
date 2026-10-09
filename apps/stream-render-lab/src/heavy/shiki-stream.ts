import { createHighlighterCore, type HighlighterCore, type LanguageInput } from '@shikijs/core'
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'
import { ShikiStreamTokenizer } from '@shikijs/stream'
import githubLight from '@shikijs/themes/github-light'
import type { ThemedToken } from 'shiki'

import { IncrementalHighlighter } from './incremental-highlighter'

const LANGUAGE_LOADERS: Record<string, () => Promise<LanguageInput[]>> = {
  bash: () => import('@shikijs/langs/bash').then((module) => module.default),
  css: () => import('@shikijs/langs/css').then((module) => module.default),
  html: () => import('@shikijs/langs/html').then((module) => module.default),
  javascript: () => import('@shikijs/langs/javascript').then((module) => module.default),
  json: () => import('@shikijs/langs/json').then((module) => module.default),
  jsx: () => import('@shikijs/langs/jsx').then((module) => module.default),
  markdown: () => import('@shikijs/langs/markdown').then((module) => module.default),
  shell: () => import('@shikijs/langs/shell').then((module) => module.default),
  tsx: () => import('@shikijs/langs/tsx').then((module) => module.default),
  typescript: () => import('@shikijs/langs/typescript').then((module) => module.default),
  yaml: () => import('@shikijs/langs/yaml').then((module) => module.default),
}

const highlighterPromise = createHighlighterCore({
  engine: createJavaScriptRegexEngine(),
  langs: [],
  themes: [githubLight],
})
const loaded = new Set<string>()
const loading = new Map<string, Promise<void>>()

function normalizedLanguage(language?: string | null): string {
  const value = language?.toLowerCase() || 'text'
  if (value === 'js') return 'javascript'
  if (value === 'ts') return 'typescript'
  if (value === 'sh') return 'shell'
  return value in LANGUAGE_LOADERS ? value : 'text'
}

async function loadLanguage(highlighter: HighlighterCore, language: string): Promise<void> {
  if (language === 'text' || loaded.has(language)) return
  let pending = loading.get(language)
  if (!pending) {
    pending = LANGUAGE_LOADERS[language]().then(async (registrations) => {
      await highlighter.loadLanguage(...registrations)
      loaded.add(language)
    })
    loading.set(language, pending)
  }
  await pending
}

export async function createShikiStream(
  language?: string | null,
): Promise<IncrementalHighlighter<ThemedToken>> {
  const lang = normalizedLanguage(language)
  const highlighter = await highlighterPromise
  await loadLanguage(highlighter, lang)
  const tokenizer = new ShikiStreamTokenizer({
    highlighter,
    lang,
    theme: 'github-light',
  })
  return new IncrementalHighlighter(tokenizer)
}
