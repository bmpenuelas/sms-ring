// The languages SMS Ring speaks, shared by the web UI, the generated
// Android/iOS resources and the store listings. Node scripts load this file
// directly (type stripping): no runtime imports here.
//
// android: values-<qualifier> ('' = default `values`); ios: <name>.lproj;
// play / appStore: fastlane metadata folder names; rtl: right-to-left script.

export const LANGUAGES = [
  { code: 'en', name: 'English', englishName: 'English', bcp47: 'en', android: '', ios: 'en', play: 'en-US', appStore: 'en-US', rtl: false },
  { code: 'es', name: 'Español', englishName: 'Spanish', bcp47: 'es', android: 'es', ios: 'es', play: 'es-ES', appStore: 'es-ES', rtl: false },
  { code: 'pt', name: 'Português (Brasil)', englishName: 'Brazilian Portuguese', bcp47: 'pt-BR', android: 'pt-rBR', ios: 'pt-BR', play: 'pt-BR', appStore: 'pt-BR', rtl: false },
  { code: 'fr', name: 'Français', englishName: 'French', bcp47: 'fr', android: 'fr', ios: 'fr', play: 'fr-FR', appStore: 'fr-FR', rtl: false },
  { code: 'de', name: 'Deutsch', englishName: 'German', bcp47: 'de', android: 'de', ios: 'de', play: 'de-DE', appStore: 'de-DE', rtl: false },
  { code: 'it', name: 'Italiano', englishName: 'Italian', bcp47: 'it', android: 'it', ios: 'it', play: 'it-IT', appStore: 'it', rtl: false },
  { code: 'nl', name: 'Nederlands', englishName: 'Dutch', bcp47: 'nl', android: 'nl', ios: 'nl', play: 'nl-NL', appStore: 'nl-NL', rtl: false },
  { code: 'sv', name: 'Svenska', englishName: 'Swedish', bcp47: 'sv', android: 'sv', ios: 'sv', play: 'sv-SE', appStore: 'sv', rtl: false },
  { code: 'pl', name: 'Polski', englishName: 'Polish', bcp47: 'pl', android: 'pl', ios: 'pl', play: 'pl-PL', appStore: 'pl', rtl: false },
  { code: 'ru', name: 'Русский', englishName: 'Russian', bcp47: 'ru', android: 'ru', ios: 'ru', play: 'ru-RU', appStore: 'ru', rtl: false },
  { code: 'tr', name: 'Türkçe', englishName: 'Turkish', bcp47: 'tr', android: 'tr', ios: 'tr', play: 'tr-TR', appStore: 'tr', rtl: false },
  { code: 'ar', name: 'العربية', englishName: 'Arabic', bcp47: 'ar', android: 'ar', ios: 'ar', play: 'ar', appStore: 'ar-SA', rtl: true },
  { code: 'hi', name: 'हिन्दी', englishName: 'Hindi', bcp47: 'hi', android: 'hi', ios: 'hi', play: 'hi-IN', appStore: 'hi', rtl: false },
  { code: 'th', name: 'ไทย', englishName: 'Thai', bcp47: 'th', android: 'th', ios: 'th', play: 'th', appStore: 'th', rtl: false },
  { code: 'vi', name: 'Tiếng Việt', englishName: 'Vietnamese', bcp47: 'vi', android: 'vi', ios: 'vi', play: 'vi', appStore: 'vi', rtl: false },
  { code: 'id', name: 'Bahasa Indonesia', englishName: 'Indonesian', bcp47: 'id', android: 'in', ios: 'id', play: 'id', appStore: 'id', rtl: false },
  { code: 'ja', name: '日本語', englishName: 'Japanese', bcp47: 'ja', android: 'ja', ios: 'ja', play: 'ja-JP', appStore: 'ja', rtl: false },
  { code: 'ko', name: '한국어', englishName: 'Korean', bcp47: 'ko', android: 'ko', ios: 'ko', play: 'ko-KR', appStore: 'ko', rtl: false },
  { code: 'zh', name: '简体中文', englishName: 'Chinese (Simplified)', bcp47: 'zh-Hans', android: 'zh-rCN', ios: 'zh-Hans', play: 'zh-CN', appStore: 'zh-Hans', rtl: false },
  { code: 'zht', name: '繁體中文', englishName: 'Chinese (Traditional)', bcp47: 'zh-Hant', android: 'zh-rTW', ios: 'zh-Hant', play: 'zh-TW', appStore: 'zh-Hant', rtl: false },
] as const

export type Language = (typeof LANGUAGES)[number]
export type LanguageCode = Language['code']

export const FALLBACK_LANGUAGE: LanguageCode = 'en'

export function languageByCode(code: LanguageCode): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]
}

/** Search-only folding; do not change the security-sensitive passphrase matcher. */
function normalizeLanguageSearch(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/ı/g, 'i')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

/** Match English and native names, including partial names and multi-word queries. */
export function searchLanguages(query: string): readonly Language[] {
  const normalized = normalizeLanguageSearch(query)
  if (!normalized) return LANGUAGES
  const terms = normalized.split(' ')
  return LANGUAGES.filter((language) => {
    const names = normalizeLanguageSearch(`${language.englishName} ${language.name}`)
    return terms.every((term) => names.includes(term))
  })
}

/** Best supported language for a BCP 47 tag ("pt-PT" → pt, "zh-TW" / "zh-Hant-HK" → zht). */
export function matchLanguage(tag: string): LanguageCode | undefined {
  const lower = tag.toLowerCase().replace('_', '-')
  if (lower.startsWith('zh')) {
    return /hant|-tw|-hk|-mo/.test(lower) ? 'zht' : 'zh'
  }
  if (lower === 'in' || lower.startsWith('in-')) return 'id'
  const base = lower.split('-')[0]
  return LANGUAGES.find((l) => l.code === base)?.code
}

export function detectLanguage(preferred: readonly string[]): LanguageCode {
  for (const tag of preferred) {
    const match = tag && matchLanguage(tag)
    if (match) return match
  }
  return FALLBACK_LANGUAGE
}
