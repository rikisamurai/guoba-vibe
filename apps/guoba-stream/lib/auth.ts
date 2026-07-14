export function isValidAccessKey(
  header: string | null,
  accessKeysEnv: string | undefined,
): boolean {
  if (!header || !accessKeysEnv) return false
  const candidate = header.trim()
  if (!candidate) return false
  return accessKeysEnv
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
    .includes(candidate)
}
