// Decides whether a message should ring the phone. Mirrors the native
// matchers; the UI uses it for the live "try a message" preview.

import { normalizePhrase, sendersMatch, unquote } from './normalize.ts'

/** A passphrase shorter than this (after normalization) never matches anything. */
export const MIN_NORMALIZED_PASSPHRASE = 6

export interface MatchInput {
  armed: boolean
  passphrase: string
  senders: string[]
  vibrateOnlyEnabled?: boolean
  vibrateOnlyPhrase?: string
}

export type MatchVerdict = 'ring' | 'vibrate-only' | 'disarmed' | 'weak-passphrase' | 'no-passphrase' | 'sender-not-allowed'

/** Each part may have one quote pair; the entire message may have one too. */
function matchesParts(message: string, first: string, second: string): boolean {
  return [message, unquote(message)].some((candidate) =>
    [first.length, first.length + 2].some((length) => {
      const left = candidate.slice(0, length)
      const right = candidate.slice(length)
      return (left === first || unquote(left) === first) && (right === second || unquote(right) === second)
    }),
  )
}

/** Exact whole-message match, optionally adding the enabled vibration-only modifier. */
export function evaluateMessage(config: MatchInput, body: string, sender: string): MatchVerdict {
  const phrase = normalizePhrase(config.passphrase)
  if (phrase.length < MIN_NORMALIZED_PASSPHRASE) return 'weak-passphrase'
  const message = normalizePhrase(body)
  const regular = message === phrase || unquote(message) === phrase
  const modifier = normalizePhrase(config.vibrateOnlyPhrase ?? '')
  const vibrateOnly = !regular && config.vibrateOnlyEnabled !== false && modifier.length > 0 &&
    (matchesParts(message, phrase, modifier) || matchesParts(message, modifier, phrase))
  if (!regular && !vibrateOnly) return 'no-passphrase'
  const allowed = config.senders.filter((s) => s.trim())
  if (allowed.length > 0 && !allowed.some((a) => sendersMatch(a, sender))) return 'sender-not-allowed'
  if (!config.armed) return 'disarmed'
  return vibrateOnly ? 'vibrate-only' : 'ring'
}
