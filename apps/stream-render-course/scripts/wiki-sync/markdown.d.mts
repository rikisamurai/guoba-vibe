export function readTitle(source: string): string
export function noteLink(prefix: string, file: string, label: string): string
export function convertMarkdown(
  markdown: string,
  routes: Map<string, string>,
  prefix: string,
): string
export function frontmatter(metadata: {
  title: string
  date: string
  source: string
  sha: string
}): string
