import { customAlphabet } from "nanoid";

// URL-safe, no look-alikes
const alphabet = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

export const nanoid8 = customAlphabet(alphabet, 8);
