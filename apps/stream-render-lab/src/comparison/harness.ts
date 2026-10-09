export interface ExternalRendererInspection {
  commits: number
  longTasks: number
  textContent: string
}

export interface ExternalRendererDriver {
  dispose(): void
  inspect(): ExternalRendererInspection
  update(raw: string, final: boolean, atMs: number): Promise<void>
}

export interface ExternalRendererFactory {
  create(): ExternalRendererDriver
  id: string
  version: string
}

export interface ExternalComparisonResult extends ExternalRendererInspection {
  id: string
  terminalEquivalent: boolean
  version: string
}

export interface ComparisonRecord {
  delta: string
  atMs: number
}

export async function runExternalRendererComparison(
  factories: readonly ExternalRendererFactory[],
  records: readonly ComparisonRecord[],
  expectedTextContent: string,
): Promise<ExternalComparisonResult[]> {
  return Promise.all(
    factories.map(async (factory) => {
      const driver = factory.create()
      let raw = ''
      let updates = Promise.resolve()
      try {
        for (const [index, record] of records.entries()) {
          raw += record.delta
          const visibleRaw = raw
          updates = updates.then(() => {
            return driver.update(visibleRaw, index === records.length - 1, record.atMs)
          })
        }
        await updates
        const inspection = driver.inspect()
        return {
          ...inspection,
          id: factory.id,
          terminalEquivalent: inspection.textContent === expectedTextContent,
          version: factory.version,
        }
      } finally {
        driver.dispose()
      }
    }),
  )
}
