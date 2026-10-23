# Development

Requirements: Node 22+, JDK 21 + Android SDK 36 (Android), Xcode 16+ on macOS (iOS).

## Layout

```
src/                 Vue app (core/, state/, ui/, i18n/, services/)
plugins/remote-ring/ local Capacitor plugin (npm workspace): TS API, Android (Java), iOS (Swift, SPM)
android/ ios/        Capacitor platform projects (committed)
assets/              icon sources (SVG) and the base PNGs generated from them
scripts/             generate-app-assets, generate-native-locales, generate-ringtone, verify-offline, run-command (result banners)
store/fastlane/      generated store listings
site/                GitHub Pages: landing page + privacy/ (static, no build step)
tests/               node:test suites (core + word lists)
```

## Website (GitHub Pages)

`site/` is plain HTML and CSS, deployed by `.github/workflows/pages.yml` on every push to `main` that touches it:

- `https://bmpenuelas.github.io/sms-ring/`: mirrors the promotional part of the README. Keep the two in sync when features change.
- `https://bmpenuelas.github.io/sms-ring/privacy/`: the privacy policy linked from the store listings.

Like the app, it loads nothing from other sites: fonts are copied from `@fontsource-variable`, and `favicon.svg` / `apple-touch-icon.png` are written by `npm run assets`. Preview it locally with `python -m http.server 5181 -d site`.

## Scripts

| Command | |
|---|---|
| `npm run dev` | Browser preview (port 5180); the plugin's web implementation simulates permissions and ringing. |
| `npm run build` | Typecheck + production build (adds the offline CSP). |
| `npm test` | Matcher vectors, passphrase generator, word lists, result banners. |
| `npm run locales` / `locales:check` | Generate / verify native strings, Xcode entries and store listings. |
| `npm run assets` / `assets:check` | Generate / verify app icons, splash screens and web icons ([ASSETS.md](ASSETS.md)). |
| `npm run ringtone` | Re-synthesize the ring tones (no third-party audio) into the Android and iOS plugin resources. |
| `npm run verify:offline` | Check the no-network guarantees. |
| `npm run cap:sync` | Check assets + build + locales + `cap sync`. |
| `npm run android:debug` | Build a debug APK. |

Every npm script ends with a framed result banner on stderr: a green `✅ SUCCESS` for exit code 0 or a red `❌ FAILED` otherwise, with the local time and date (`HH:mm:ss DD/MM/YYYY`). `scripts/run-command.mjs` wraps each external command (`vite`, `vue-tsc`, `cap`, `node`, `npm`, `adb`) without a shell, and the custom scripts import `scripts/lib/cli-failure.mjs` so running them directly is covered too.

- stdout is untouched, so JSON and pipes still work. Color follows the terminal: `NO_COLOR`, `TERM=dumb` and `FORCE_COLOR=0` turn it off, `FORCE_COLOR=1` forces it.
- Success is per command step, not per `&&` chain: a later step can still fail, and a long-running `dev` server reports only when it exits.
- The banner never changes the exit status and never repeats arguments or environment values.

## Testing end to end

- **Android emulator**: install, turn on, grant, then `adb emu sms send 5550100 "<your phrase>"`.
- **Android device**: text the phrase from another phone; lock the device first to see the stop screen.
- **iPhone**: follow the in-app Shortcuts guide; text yourself the phrase.

## Configuration to set before release

- `appId` (`capacitor.config.ts`, Android `applicationId`/`namespace`, iOS bundle id): currently `app.smsring`.
- `SOURCE_URL` in `src/app.config.ts`.
- App icons and splash: chosen and generated (`npm run assets`, see [ASSETS.md](ASSETS.md)).

The git pre-commit hook in `.githooks/` checks generated assets and locales before each commit; `npm install` enables it.
