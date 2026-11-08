// Decides whether a message should ring the phone. Mirrors the native
// matchers; the UI uses it for the live "try a message" preview.

import { normalizePhrase, sendersMatch } from './normalize.ts'

/** A passphrase shorter than this (after normalization) never matches anything. */
export const MIN_NORMALIZED_PASSPHRASE = 6

/**
 * "ring" in every app language: the word an iPhone user types in the Shortcuts
 * automation's *Message Contains* field (iOS refuses an automation with both
 * Sender and Message Contains empty). Messages from the iOS helper text start
 * with it, so it may come before or after the passphrase. Kept identical to
 * `ios.ringWord` in each locale (tests/matching.test.ts) and to the Java/Swift lists.
 */
export const RING_WORDS = [
  'ring', 'suena', 'toca', 'sonne', 'klingeln', 'squilla', 'bel', 'dzwoni', 'звонок', 'çal',
  'رنين', 'रिंग', 'เรียกเข้า', 'reo', 'dering', '着信', '벨', '响铃', '響鈴',
] as const

const NORMALIZED_RING_WORDS = [...new Set(RING_WORDS.map(normalizePhrase).filter(Boolean))]

export interface MatchInput {
  armed: boolean
  passphrase: string
  senders: string[]
  vibrateOnlyEnabled?: boolean
  vibrateOnlyPhrase?: string
}

export type MatchVerdict = 'ring' | 'vibrate-only' | 'disarmed' | 'weak-passphrase' | 'no-passphrase' | 'sender-not-allowed'

/** The message as is, and without a ring word at its start or at its end. */
function withoutRingWord(message: string): string[] {
  const candidates = [message]
  for (const word of NORMALIZED_RING_WORDS) {
    if (message.length > word.length && message.startsWith(word)) candidates.push(message.slice(word.length))
    if (message.length > word.length && message.endsWith(word)) candidates.push(message.slice(0, message.length - word.length))
  }
  return candidates
}

/** Whole-message match: the passphrase, optionally with the enabled vibration-only modifier. */
export function evaluateMessage(config: MatchInput, body: string, sender: string): MatchVerdict {
  const phrase = normalizePhrase(config.passphrase)
  if (phrase.length < MIN_NORMALIZED_PASSPHRASE) return 'weak-passphrase'
  const candidates = withoutRingWord(normalizePhrase(body))
  const regular = candidates.includes(phrase)
  const modifier = normalizePhrase(config.vibrateOnlyPhrase ?? '')
  const vibrateOnly = !regular && config.vibrateOnlyEnabled !== false && modifier.length > 0 &&
    candidates.some((candidate) => candidate === phrase + modifier || candidate === modifier + phrase)
  if (!regular && !vibrateOnly) return 'no-passphrase'
  const allowed = config.senders.filter((s) => s.trim())
  if (allowed.length > 0 && !allowed.some((a) => sendersMatch(a, sender))) return 'sender-not-allowed'
  if (!config.armed) return 'disarmed'
  return vibrateOnly ? 'vibrate-only' : 'ring'
}
