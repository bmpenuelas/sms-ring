// UI-only preferences (not needed by the native ringer): kept in the web
// view's local storage, inside the app sandbox.

import { reactive, watch } from 'vue'

import { DEFAULT_WORDS } from '../core/passphrase'
import type { CapabilityName } from 'capacitor-remote-ring'

import type { LanguageCode } from '../i18n'
import type { ThemeChoice } from './theme'

const KEY = 'smsRing.prefs'

export interface Prefs {
  /** Word list used for generated passphrases ('auto' = app language). */
  wordLanguage: LanguageCode | 'auto'
  wordCount: number
  /** The passphrase was typed by the user, not generated. */
  customPassphrase: boolean
  /** Passphrase hidden behind dots on the main page. */
  hidePassphrase: boolean
  /** Recommended permissions the user chose "Not now" for: setup stops asking. */
  skipped: CapabilityName[]
  /** The user declined SMS access at least once (shows the "won't ring" warning). */
  smsDeclined: boolean
  /** Light, dark, or follow the system (default). */
  theme: ThemeChoice
}

function load(): Prefs {
  const defaults: Prefs = {
    wordLanguage: 'auto',
    wordCount: DEFAULT_WORDS,
    customPassphrase: false,
    hidePassphrase: false,
    skipped: [],
    smsDeclined: false,
    theme: 'system',
  }
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return defaults
  }
}

export const prefs = reactive<Prefs>(load())

watch(
  prefs,
  (value) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(value))
    } catch {
      // Storage unavailable: keep the in-memory value.
    }
  },
  { deep: true },
)
