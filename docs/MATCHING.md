# Passphrase and sender matching

Implemented three times, kept identical by shared test vectors (`plugins/remote-ring/test-fixtures/matching.json`):

| Platform | File | Test |
|---|---|---|
| TypeScript (UI simulator) | `src/core/normalize.ts`, `src/core/matcher.ts` | `npm test` |
| Android | `MessageMatcher.java` | `gradlew :capacitor-remote-ring:testDebugUnitTest` |
| iOS | `MessageMatcher.swift` | `swift test` (plugins/remote-ring) |

## Rule: the whole message must be the passphrase

Only **spaces, capitals and accents/tildes** may differ. Nothing else may be added, removed or reordered: no greeting, no punctuation.

| Phrase `blue tiger moon` | Rings? |
|---|---|
| `Blue tiger MOON`, `bluetigermoon`, `  blue  tiger moon ⏎` | ✅ |
| `blue tiger moon!`, `Hey blue tiger moon`, `blue-tiger-moon`, `moon tiger blue` | ❌ |
| Phrase `piña año`, message `pina ano` | ✅ |

## `normalizePhrase`

1. lowercase (locale-independent)
2. Unicode **NFKD** (full-width → ASCII, accents detached)
3. remove combining marks (`\p{M}`): accents, tildes, dieresis…
4. remove whitespace, separators and invisible format characters (`[\s\p{Z}\p{Cf}]`)

The message rings when `normalizePhrase(message) === normalizePhrase(passphrase)` (UTF-16 code-unit equality on all platforms). Normalized passphrases shorter than **6** units never match (`weak-passphrase`).

## Senders

- Phone numbers keep ASCII digits only; IDs with letters (`My-Bank`) keep letters and digits (`normalizeKey`).
- Two numbers match when their last **9** digits are equal (or all digits, if one is shorter): `+34 600 11 22 33` = `0034600112233` = `600112233`.
- Numbers under 7 digits (short codes) and alphanumeric IDs must match exactly.
- No senders configured = anyone. On iOS, if senders are configured but the automation passes no sender, it does not ring.

## Verdicts

`ring`, `disarmed`, `weak-passphrase`, `no-passphrase` (the message is not exactly the phrase), `sender-not-allowed`; shown live in the *Try a message* sheet.

## Passphrase generation

`src/core/passphrase.ts`: `crypto.getRandomValues` with rejection sampling, distinct words via partial Fisher–Yates. Each language has 128 words distinct after normalization (7 bits/word; 3 words ≈ 21 bits, 6 words ≈ 41 bits). Words whose letters don't fold under NFKD (Turkish `ı`, Polish `ł`, Vietnamese `đ`, German `ß`) are excluded so senders can type them on any keyboard.
