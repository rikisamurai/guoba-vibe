import { customAlphabet } from 'nanoid'

const alphabet = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'

export const nanoid8 = customAlphabet(alphabet, 8)
