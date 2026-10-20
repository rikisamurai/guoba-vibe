/// <reference types="@rspress/core/types" />

interface ImportMetaEnv {
  readonly PUBLIC_LAB_ORIGIN?: string
  readonly SSG_MD?: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.css'
