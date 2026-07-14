export function hasFileSystemErrorCode(
  error: unknown,
  code: string,
): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code
}

export function isMissingPathError(error: unknown): boolean {
  return hasFileSystemErrorCode(error, 'ENOENT')
}
