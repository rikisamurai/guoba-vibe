import type { HighlighterCore, LanguageRegistration } from 'shiki/core'

/**
 * Singleton Shiki core with the JS regex engine (no wasm) and one theme.
 * Everything — core, engine, theme, grammars — loads lazily on the first
 * closed code fence and stays cached: the M3 lesson is that heavy resources
 * are shared, lazy, and never re-created per commit.
 */
export const SHIKI_THEME = 'vesper'

let corePromise: Promise<HighlighterCore> | null = null

function getHighlighter(): Promise<HighlighterCore> {
  corePromise ??= (async () => {
    const [core, engine] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
    ])
    return core.createHighlighterCore({
      themes: [import('shiki/themes/vesper.mjs')],
      langs: [],
      engine: engine.createJavaScriptRegexEngine(),
    })
  })()
  return corePromise
}

type LangLoader = () => Promise<{ default: LanguageRegistration[] }>

const LANG_LOADERS: Record<string, LangLoader> = {
  ts: () => import('shiki/langs/typescript.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  js: () => import('shiki/langs/javascript.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  py: () => import('shiki/langs/python.mjs'),
  bash: () => import('shiki/langs/bash.mjs'),
  sh: () => import('shiki/langs/bash.mjs'),
  shell: () => import('shiki/langs/bash.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  md: () => import('shiki/langs/markdown.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
}

const loadedLangs = new Set<string>()

/** Returns highlighted HTML, or null when the language is not supported. */
export async function highlightCode(code: string, lang: string): Promise<string | null> {
  const loader = LANG_LOADERS[lang]
  if (loader === undefined) return null
  const highlighter = await getHighlighter()
  if (!loadedLangs.has(lang)) {
    const mod = await loader()
    await highlighter.loadLanguage(mod.default)
    loadedLangs.add(lang)
  }
  return highlighter.codeToHtml(code, { lang, theme: SHIKI_THEME })
}
