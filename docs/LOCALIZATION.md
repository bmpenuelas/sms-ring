# Localization

20 languages: en, es, pt-BR, fr, de, it, nl, sv, pl, ru, tr, ar (RTL), hi, th, vi, id, ja, ko, zh-Hans, zh-Hant. Defined once in `src/i18n/languages.ts` with their Android, iOS, Play and App Store codes.

## Sources of truth

| What | Where |
|---|---|
| All copy (UI, native, store listings) | `src/i18n/locales/<code>.ts`, typed against `en.ts` (`Messages`) so a missing key fails `npm run typecheck`. |
| Passphrase words | `src/i18n/words/<code>.ts` (128 each, tested by `tests/words.test.ts`). |

Plurals are functions in the catalogue (e.g. Polish/Russian/Arabic forms); dates, durations and numbers use `Intl` (`formatDuration`, `formatRelative`, `formatNumber` in `src/i18n/index.ts`).

## Generated files (`npm run locales`, checked by `npm run locales:check`)

| Output | Purpose |
|---|---|
| `android/app/src/main/res/values-*/strings.xml` | App name per language: Play detects the app's languages from these. |
| `plugins/remote-ring/android/src/main/res/values-*/strings.xml` | Notification channels, stop screen. `{sender}` → `%1$s`. |
| `android/app/src/main/res/xml/locales_config.xml` | Android 13+ per-app language setting. |
| `ios/App/App/<lang>.lproj/InfoPlist.strings`, `Localizable.strings` | Display name, notification text, App Intent titles. English text is the key. `{sender}` → `%@`. |
| `ios/App/App/Info.plist` `CFBundleLocalizations` + Xcode variant groups + `knownRegions` | The App Store lists these languages. |
| `store/fastlane/metadata/{android,ios}/<locale>/*.txt` | Store listings (title, short/full description, subtitle, keywords, promo). Limits are enforced; the script fails if one is too long. |

## Runtime

`src/i18n/index.ts`: language = user choice → phone's preferred languages → English. Catalogues and word lists are lazy-loaded chunks. `<html lang dir>` follows the language (Arabic switches to RTL).

## Adding a language

1. Add it to `LANGUAGES`.
2. Copy `en.ts` → `<code>.ts`, translate (the type checker lists every missing key).
3. Add `words/<code>.ts` with 128 words distinct after normalization.
4. `npm run locales && npm test`.
