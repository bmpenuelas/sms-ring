// Decides whether a message should ring the phone. Mirrors the native
// matchers; the UI uses it for the live "try a message" preview.

import { normalizePhrase, sendersMatch } from './normalize.ts'

/** A passphrase shorter than this (after normalization) never matches anything. */
export const MIN_NORMALIZED_PASSPHRASE = 6

export interface MatchInput {
  armed: boolean
  passphrase: string
  senders: string[]
}

export type MatchVerdict = 'ring' | 'disarmed' | 'weak-passphrase' | 'no-passphrase' | 'sender-not-allowed'

/** The whole message must be the passphrase; only spaces, capitals and accents may differ. */
export function evaluateMessage(config: MatchInput, body: string, sender: string): MatchVerdict {
  const phrase = normalizePhrase(config.passphrase)
  if (phrase.length < MIN_NORMALIZED_PASSPHRASE) return 'weak-passphrase'
  if (normalizePhrase(body) !== phrase) return 'no-passphrase'
  const allowed = config.senders.filter((s) => s.trim())
  if (allowed.length > 0 && !allowed.some((a) => sendersMatch(a, sender))) return 'sender-not-allowed'
  return config.armed ? 'ring' : 'disarmed'
}
