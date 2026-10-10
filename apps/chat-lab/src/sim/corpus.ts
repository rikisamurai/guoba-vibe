import codeHeavy from './corpus/code-heavy.md?raw'
import edgeCases from './corpus/edge-cases.md?raw'
import longForm from './corpus/long-form.md?raw'
import mermaidTour from './corpus/mermaid.md?raw'

export interface Corpus {
  id: string
  label: string
  text: string
}

export const CORPORA: Corpus[] = [
  { id: 'long-form', label: 'long-form article', text: longForm },
  { id: 'code-heavy', label: 'code-heavy tour', text: codeHeavy },
  { id: 'mermaid', label: 'mermaid diagrams', text: mermaidTour },
  { id: 'edge-cases', label: 'hostile edge cases', text: edgeCases },
]

export function getCorpus(id: string): Corpus {
  return CORPORA.find((corpus) => corpus.id === id) ?? CORPORA[0]
}
