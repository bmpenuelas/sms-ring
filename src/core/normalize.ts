// Text and phone-number normalization. The Android (MessageMatcher.java) and
// iOS (MessageMatcher.swift) ports must produce exactly the same output: see
// docs/MATCHING.md. Pure functions, no imports: Node tests load this directly.

/** Whitespace, separators and invisible format characters (zero-width spaces, BOM). */
const INVISIBLE = /[\s\p{Z}\p{Cf}]/gu

/**
 * The comparable form of a passphrase or message: lowercase, compatibility
 * folding (full-width → ASCII), accents and tildes removed, all whitespace
 * removed. Punctuation and every other character are kept, so a message must
 * be exactly the passphrase. "  Blue TIGER  móon " → "bluetigermoon".
 */
export function normalizePhrase(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(INVISIBLE, '')
}

/** Letters and digits only: used to compare alphanumeric sender IDs ("My-Bank" = "MYBANK"). */
export function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

/** Phone numbers keep only their digits; alphanumeric sender IDs keep their letters and digits. */
export function normalizeSender(sender: string): string {
  const digits = sender.replace(/\D/g, '')
  return digits.length >= 3 && !/\p{L}/u.test(sender) ? digits : normalizeKey(sender)
}

/** Digits compared from the right: enough to ignore country and trunk prefixes. */
export const SENDER_SUFFIX_DIGITS = 9

/**
 * Same sender? "+34 600 11 22 33", "0034600112233" and "600112233" all match.
 * Short codes (under 7 digits) and alphanumeric IDs must match exactly.
 */
export function sendersMatch(allowed: string, actual: string): boolean {
  const a = normalizeSender(allowed)
  const b = normalizeSender(actual)
  if (!a || !b) return false
  const numeric = /^\d+$/
  if (!numeric.test(a) || !numeric.test(b)) return a === b
  if (Math.min(a.length, b.length) < 7) return a === b
  const n = Math.min(SENDER_SUFFIX_DIGITS, a.length, b.length)
  return a.slice(-n) === b.slice(-n)
}

/** "+34 600 11 22 33" → "•••• 2233": what the local history keeps. */
export function maskSender(sender: string): string {
  const s = sender.trim()
  if (s.length <= 4) return '••••'
  return `•••• ${s.slice(-4)}`
}
