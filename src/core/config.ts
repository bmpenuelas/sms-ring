// The persisted configuration: defaults, limits and sanitizing of anything
// read back from storage.

import type { RingConfig, ToneId } from 'capacitor-remote-ring'
import { normalizePhrase } from './normalize.ts'

export type { RingConfig, ToneId }

/** Selectable ring durations (seconds). */
export const DURATION_STEPS = [15, 30, 60, 120, 180, 300] as const
export const DEFAULT_DURATION = 60
export const MIN_DURATION = 5
export const MAX_DURATION = 600
export const MAX_SENDERS = 10
/** Ring tones in menu order ("system" is Android only). Files: scripts/generate-ringtone.mjs. */
export const TONES: readonly ToneId[] = ['beacon', 'chime', 'pulse', 'siren', 'bells', 'system']
export const DEFAULT_TONE: ToneId = 'beacon'
/** Ring volume in percent of the maximum; set in steps of 10. */
export const MIN_VOLUME = 10
export const MAX_VOLUME = 100

export function defaultConfig(passphrase = '', vibrateOnlyPhrase = 'vibration only'): RingConfig {
  return {
    version: 1,
    armed: true,
    passphrase,
    senders: [],
    durationSeconds: DEFAULT_DURATION,
    vibrate: true,
    vibrateOnlyEnabled: true,
    vibrateOnlyPhrase,
    overrideDnd: true,
    tone: DEFAULT_TONE,
    volume: MAX_VOLUME,
    chatApps: false,
  }
}

export function sanitizeConfig(input: unknown, fallbackPassphrase: string, fallbackVibrateOnlyPhrase = 'vibration only'): RingConfig {
  const base = defaultConfig(fallbackPassphrase, fallbackVibrateOnlyPhrase)
  if (!input || typeof input !== 'object') return base
  const c = input as Partial<RingConfig>
  const duration = Number(c.durationSeconds)
  return {
    version: 1,
    armed: c.armed !== false,
    passphrase: typeof c.passphrase === 'string' && c.passphrase.trim() ? c.passphrase.trim() : base.passphrase,
    senders: Array.isArray(c.senders)
      ? c.senders.filter((s): s is string => typeof s === 'string').slice(0, MAX_SENDERS)
      : [],
    durationSeconds: Number.isFinite(duration)
      ? Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(duration)))
      : base.durationSeconds,
    vibrate: c.vibrate !== false,
    vibrateOnlyEnabled: typeof c.vibrateOnlyEnabled === 'boolean' ? c.vibrateOnlyEnabled : base.vibrateOnlyEnabled,
    vibrateOnlyPhrase: typeof c.vibrateOnlyPhrase === 'string' && normalizePhrase(c.vibrateOnlyPhrase)
      ? c.vibrateOnlyPhrase.trim() : base.vibrateOnlyPhrase,
    overrideDnd: c.overrideDnd !== false,
    tone: TONES.includes(c.tone as ToneId) ? (c.tone as ToneId) : DEFAULT_TONE,
    volume: Number.isFinite(Number(c.volume))
      ? Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, Math.round(Number(c.volume))))
      : MAX_VOLUME,
    chatApps: c.chatApps === true,
  }
}

/** Nearest selectable step index for a duration. */
export function durationStepIndex(seconds: number): number {
  let best = 0
  DURATION_STEPS.forEach((s, i) => {
    if (Math.abs(s - seconds) < Math.abs(DURATION_STEPS[best] - seconds)) best = i
  })
  return best
}
