// The app's language: the user's choice, else the phone's preferred languages,
// else English. `t` is the current copy (`t.value.passphrase.title` in
// scripts, `t.passphrase.title` in templates). Non-English catalogues and the
// passphrase word lists are loaded on demand, from the app bundle.
import { computed, ref, shallowRef, watch } from 'vue'

import { detectLanguage, LANGUAGES, languageByCode, matchLanguage, type LanguageCode } from './languages'
import en, { type Messages } from './locales/en'

export { LANGUAGES, languageByCode, type LanguageCode } from './languages'
export type { Messages } from './locales/en'
export type AppMessages = Messages['app']
export type LanguagePreference = LanguageCode | 'auto'

const STORAGE_KEY = 'smsRing.language'

const catalogueLoaders = import.meta.glob<{ default: Messages }>(['./locales/*.ts', '!./locales/en.ts'])
const wordLoaders = import.meta.glob<{ default: readonly string[] }>('./words/*.ts')

function readPreference(): LanguagePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return !stored || stored === 'auto' ? 'auto' : (matchLanguage(stored) ?? 'auto')
  } catch {
    return 'auto'
  }
}

function systemLanguage(): LanguageCode {
  const preferred = typeof navigator === 'undefined' ? [] : [...(navigator.languages ?? []), navigator.language]
  return detectLanguage(preferred)
}

export const languagePreference = ref<LanguagePreference>(readPreference())
export const deviceLanguage = ref<LanguageCode>(systemLanguage())

if (typeof window !== 'undefined') {
  window.addEventListener('languagechange', () => {
    deviceLanguage.value = systemLanguage()
  })
}

export const language = computed<LanguageCode>(() =>
  languagePreference.value === 'auto' ? deviceLanguage.value : languagePreference.value,
)

/** BCP 47 tag of the current language, for Intl formatting. */
export const locale = computed(() => languageByCode(language.value).bcp47)
export const isRtl = computed(() => languageByCode(language.value).rtl)

const catalogue = shallowRef<Messages>(en)
export const t = computed<AppMessages>(() => catalogue.value.app)

export async function loadCatalogue(code: LanguageCode): Promise<Messages> {
  if (code === 'en') return en
  const loader = catalogueLoaders[`./locales/${code}.ts`]
  return loader ? (await loader()).default : en
}

export async function loadWords(code: LanguageCode): Promise<readonly string[]> {
  const loader = wordLoaders[`./words/${code}.ts`] ?? wordLoaders['./words/en.ts']
  return (await loader()).default
}

export function setLanguagePreference(preference: LanguagePreference) {
  languagePreference.value = preference
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Not persisted: the choice still applies until restart.
  }
}

watch(
  language,
  async (code) => {
    const next = await loadCatalogue(code)
    if (code === language.value) catalogue.value = next
    if (typeof document !== 'undefined') {
      document.documentElement.lang = languageByCode(code).bcp47
      document.documentElement.dir = languageByCode(code).rtl ? 'rtl' : 'ltr'
    }
  },
  { immediate: true },
)

// ---- Formatting helpers (Intl does the per-language work) ----

export function formatDuration(seconds: number, style: 'short' | 'long' | 'narrow' = 'long'): string {
  const unitDisplay = style
  if (seconds < 60 || seconds % 60 !== 0) {
    return new Intl.NumberFormat(locale.value, { style: 'unit', unit: 'second', unitDisplay }).format(seconds)
  }
  return new Intl.NumberFormat(locale.value, { style: 'unit', unit: 'minute', unitDisplay }).format(seconds / 60)
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  const nf = new Intl.NumberFormat(locale.value, { minimumIntegerDigits: 2 })
  return `${new Intl.NumberFormat(locale.value).format(m)}:${nf.format(s)}`
}

export function formatRelative(epochMs: number): string {
  const diff = (epochMs - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
  const abs = Math.abs(diff)
  if (abs < 60) return rtf.format(Math.round(diff), 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  return rtf.format(Math.round(diff / 86400), 'day')
}

export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale.value, options).format(n)
}

/** Renders `**bold**` segments of a step as parts (never as HTML). */
export function richParts(text: string): { text: string; bold: boolean }[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) =>
    part.startsWith('**') ? { text: part.slice(2, -2), bold: true } : { text: part, bold: false },
  )
}

export { LANGUAGES as SUPPORTED_LANGUAGES }
