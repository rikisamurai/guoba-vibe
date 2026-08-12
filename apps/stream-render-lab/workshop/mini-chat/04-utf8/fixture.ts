export const UTF8_FIXTURE_TEXT = '你好，👋 streaming'

const encoded = new TextEncoder().encode(UTF8_FIXTURE_TEXT)

export const UTF8_FIXTURE_CHUNKS = Array.from(encoded, (byte) => Uint8Array.of(byte))
