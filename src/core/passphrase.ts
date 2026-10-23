// Passphrase generation from a word list, with the platform's cryptographic
// random source and rejection sampling (no modulo bias).

export const MIN_WORDS = 2
export const MAX_WORDS = 6
export const DEFAULT_WORDS = 3

export type RandomSource = (max: number) => number

/** Uniform integer in [0, max). */
export function secureRandomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) throw new RangeError('max out of range')
  const limit = Math.floor(2 ** 32 / max) * max
  const buf = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    if (buf[0] < limit) return buf[0] % max
  }
}

/** Picks `count` distinct words. */
export function generateWords(words: readonly string[], count: number, random: RandomSource = secureRandomInt): string[] {
  const pool = [...new Set(words)]
  const n = Math.max(MIN_WORDS, Math.min(MAX_WORDS, Math.floor(count)))
  if (pool.length < n) throw new RangeError('word list too short')
  const picked: string[] = []
  for (let i = 0; i < n; i++) {
    const j = i + random(pool.length - i)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
    picked.push(pool[i])
  }
  return picked
}

/** Entropy in bits of `count` distinct words drawn from `listSize`. */
export function entropyBits(listSize: number, count: number): number {
  let bits = 0
  for (let i = 0; i < count; i++) bits += Math.log2(Math.max(1, listSize - i))
  return bits
}

/** Splits a stored passphrase back into its words for display. */
export function splitWords(passphrase: string): string[] {
  return passphrase.split(/\s+/u).filter(Boolean)
}
