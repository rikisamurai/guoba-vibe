export type EnvironmentProfile = {
  id: string
  name: string
  params: Record<string, string>
}

export type EnvironmentLink = {
  id: string
  name: string
  url: string
  queryCount: number
}

export function buildEnvironmentLinks(
  rawUrl: string,
  profiles: EnvironmentProfile[],
): EnvironmentLink[] {
  const source = new URL(rawUrl)

  return profiles.map((profile) => {
    const target = new URL(source.href)

    for (const [key, value] of Object.entries(profile.params)) {
      target.searchParams.set(key, value)
    }

    return {
      id: profile.id,
      name: profile.name,
      url: target.href,
      queryCount: Array.from(target.searchParams.entries()).length,
    }
  })
}

export function readDeepLinkParts(rawUrl: string) {
  const url = new URL(rawUrl)
  const path = [url.hostname, url.pathname.replace(/^\//, '')].filter(Boolean).join('/')

  return {
    scheme: url.protocol.replace(/:$/, ''),
    path,
    query: Array.from(url.searchParams.entries()).map(([key, value]) => ({ key, value })),
  }
}

export function upsertQueryParam(rawUrl: string, key: string, value: string) {
  const target = new URL(rawUrl)
  target.searchParams.set(key, value)
  return target.href
}

export function removeQueryParam(rawUrl: string, key: string) {
  const target = new URL(rawUrl)
  target.searchParams.delete(key)
  return target.href
}
