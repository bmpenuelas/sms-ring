# Passphrase and sender matching

Implemented three times, kept identical by shared test vectors (`plugins/remote-ring/test-fixtures/matching.json`):

| Platform | File | Test |
|---|---|---|
| TypeScript (UI simulator) | `src/core/normalize.ts`, `src/core/matcher.ts` | `npm test` |
| Android | `MessageMatcher.java` | `gradlew :capacitor-remote-ring:testDebugUnitTest` |
| iOS | `MessageMatcher.swift` | `swift test` (plugins/remote-ring) |

## Rule: the whole message must be the passphrase

Only **spaces, capitals, accents/tildes and one pair of wrapping quotes** may differ. Nothing else may be added, removed or reordered: no greeting, no punctuation.

| Phrase `blue tiger moon` | Rings? |
|---|---|
| `Blue tiger MOON`, `bluetigermoon`, `  blue  tiger moon ⏎` | ✅ |
| `"blue tiger moon"`, `“Blue tiger moon”`, `« blue tiger moon »`, `「blue tiger moon」` | ✅ |
| `blue tiger moon!`, `Hey blue tiger moon`, `blue-tiger-moon`, `moon tiger blue` | ❌ |
| `"blue tiger moon` (one side only), `""blue tiger moon""` (two pairs), `"blue tiger moon".` | ❌ |
| Phrase `piña año`, message `pina ano` | ✅ |

## `normalizePhrase`

1. lowercase (locale-independent)
2. Unicode **NFKD** (full-width → ASCII, accents detached)
3. remove combining marks (`\p{M}`): accents, tildes, dieresis…
4. remove whitespace, separators and invisible format characters (`[\s\p{Z}\p{Cf}]`)

The message rings when `normalizePhrase(message) === normalizePhrase(passphrase)` or, after dropping one wrapping quote pair with `unquote`, `unquote(normalizePhrase(message)) === normalizePhrase(passphrase)` (UTF-16 code-unit equality on all platforms).

`unquote` works on the normalized text, so whitespace between a quote and the phrase doesn't matter. It removes the first and last character only when both are quote marks: `"` `'` `` ` `` `“ ” „ ‟ ‘ ’ ‚ ‛` `« » ‹ ›` `「 」 『 』` `〝 〞 〟` (full-width `＂ ＇` fold to `" '` first). Quotes are only stripped from the message: a passphrase that itself starts and ends with quotes still matches when typed exactly as it is. Normalized passphrases shorter than **6** units never match (`weak-passphrase`).

## Senders

- Phone numbers keep ASCII digits only; IDs with letters (`My-Bank`) keep letters and digits (`normalizeKey`).
- Two numbers match when their last **9** digits are equal (or all digits, if one is shorter): `+34 600 11 22 33` = `0034600112233` = `600112233`.
- Numbers under 7 digits (short codes) and alphanumeric IDs must match exactly.
- No senders configured = anyone. On iOS, if senders are configured but the automation passes no sender, it does not ring.

## Optional vibrate-only modifier

Settings → **Vibrate-only mode** is on by default (a saved off choice is preserved). When enabled, the editable
**Vibrate-only words** default to “vibration only”, translated into the app's
language (20 locales). Untouched defaults follow language changes; custom words
are preserved. Empty or whitespace-only settings revert to the localized default.
The saved modifier is shared with the native background matcher. The settings row
shows the configured words; tapping its title/description opens a minimal editor
sheet. The separate switch in Settings still enables/disables the feature.

The modifier editor and secret-passphrase sheet share `PassphraseShareActions.vue`.
Copy and Share (including the home-screen shortcuts) both use
`src/core/instructions.ts` to generate the same localized instructions. The normal
message mentions vibration only when normal vibration is on; the silent message
appears only when vibrate-only mode is on. Matching/quoting explanations are not
included in copied/shared instructions. Sender restrictions,
chat-app triggering and the paused warning appear only when applicable. No claim
of full volume or DND bypass is made, and allowed phone numbers are not disclosed.

For passphrase `blue tiger moon` and modifier `vibration only`, these all request
**vibration without the alarm sound**:

| Form | Examples |
|---|---|
| Modifier after / before | `blue tiger moon vibration only`, `vibration only blue tiger moon` |
| Entire message quoted | `"blue tiger moon vibration only"`, `“vibration only blue tiger moon”` |
| Each part quoted | `"blue tiger moon" "vibration only"`, `“vibration only” «blue tiger moon»` |
| Only one part quoted | `"blue tiger moon" vibration only`, `vibration only "blue tiger moon"` |
| Outer quotes plus quoted parts | `「“blue tiger moon” «vibration only»」` |
| Normalization | `VÍBRATION ONLY  BLÚE TÍGER MÓÓN`, `bluetigermoonvibrationonly` |

All forms work in either order, with the same normalization and quote characters
listed above. Each complete part can have one quote pair, and the complete message
can have one outer pair. Quotes *inside* a configured phrase remain literal; this
does not strip arbitrary punctuation or quotes from the text.

The passphrase **alone still rings normally**. The modifier alone never triggers
anything. Extra text, extra punctuation, partial words, repeated modifiers,
one-sided quotes or a modifier inserted *inside* the passphrase do not match.
The master switch, minimum passphrase length and sender filter still apply.
When the feature is disabled, messages containing the extra modifier do not match.

A vibration-only trigger forces vibration even if “Vibrate while ringing” is off.
Android skips tone playback, audio focus, volume changes and DND lifting; a new
vibration-only SMS also stops a previous audible alarm. The fallback notification
uses a dedicated channel with vibration and no sound, and carries the silent mode
through to the stop screen. iOS skips the audio player/session and requests system
vibration; vibration availability and continued execution depend on the device's
haptics/background restrictions. No silent audio is played to keep iOS awake.
Other apps' own incoming-message sounds are outside SMS Ring's control.

The shared fixture includes positive/negative modifier cases, quoting variations,
custom/localized modifiers, Unicode normalization and sender/armed/weak-phrase
checks, run by the TypeScript, Android and iOS matcher tests.

## Verdicts

`ring`, `vibrate-only`, `disarmed`, `weak-passphrase`, `no-passphrase` (the message is not exactly the phrase or enabled modifier combination), `sender-not-allowed`; shown live in the *Try a message* sheet.

## Passphrase generation

`src/core/passphrase.ts`: `crypto.getRandomValues` with rejection sampling, distinct words via partial Fisher–Yates. Each language has 128 words distinct after normalization (7 bits/word; 3 words ≈ 21 bits, 6 words ≈ 41 bits). Words whose letters don't fold under NFKD (Turkish `ı`, Polish `ł`, Vietnamese `đ`, German `ß`) are excluded so senders can type them on any keyboard.
