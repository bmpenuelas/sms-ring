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

## Store listing CSV exports

Run `npm run store:csv:android` for Google Play or `npm run store:csv:ios` for the Apple App Store.
These read the existing `store/fastlane/metadata/{android,ios}/<locale>/*.txt` files; run `npm run locales`
first if you changed the catalogue and need to refresh those files.

The generated, git-ignored `store/exports/android.csv` and `store/exports/ios.csv` each contain one row
per supported language, in `LANGUAGES` order. The `locale` column uses the store-specific code.
Android columns are `title`, `short_description`, `full_description`; Apple columns are `name`,
`subtitle`, `description`, `keywords`, `promotional_text`. Additional locale-level `.txt` files
are automatically included as extra columns (blank for languages without that optional field).
Missing supported-language folders or required fields fail the export rather than omit a language.

CSV output is UTF-8 with a BOM, comma-separated, with quoted cells and CRLF record separators.
Embedded newlines, Unicode, commas and quotation marks are preserved. Only an input BOM and one
final file newline are removed; descriptions retain their paragraph breaks and other whitespace.
These are review/export tables, not store-specific upload templates.

To choose an output path, pass it after `--`, for example:

```bash
npm run store:csv:android -- "exports/google-play.csv"
npm run store:csv:ios -- "exports/apple.csv"
```

Custom paths are relative to the working directory; default paths are relative to the repository.

## Runtime

`src/i18n/index.ts`: language = user choice → phone's preferred languages → English. Catalogues and word lists are lazy-loaded chunks. `<html lang dir>` follows the language (Arabic switches to RTL).

## Adding a language

1. Add it to `LANGUAGES`.
2. Copy `en.ts` → `<code>.ts`, translate (the type checker lists every missing key).
3. Add `words/<code>.ts` with 128 words distinct after normalization.
4. `npm run locales && npm test`.
