export const maxImageBytes = 900 * 1024
const supportedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

export function validateImageFile(file: Pick<File, 'size' | 'type'>) {
  if (!supportedImageTypes.has(file.type)) return 'Choose a PNG, JPEG, WebP, or GIF image.'
  if (file.size > maxImageBytes) return 'Image exceeds 900KB. Compress it or use an image URL.'
  return ''
}

export function readImageFile(file: File): Promise<string> {
  const error = validateImageFile(file)
  if (error) return Promise.reject(new Error(error))

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('The image could not be encoded.'))
    })
    reader.addEventListener('error', () => reject(new Error('The image could not be read.')))
    reader.readAsDataURL(file)
  })
}
