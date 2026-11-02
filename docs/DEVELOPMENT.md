# Development

Requirements: Node 22+, JDK 21 + Android SDK 36 (Android), Xcode 16+ on macOS (iOS).

## Layout

```
src/                 Vue app (core/, state/, ui/, i18n/, services/)
plugins/remote-ring/ local Capacitor plugin (npm workspace): TS API, Android (Java), iOS (Swift, SPM)
android/ ios/        Capacitor platform projects (committed)
assets/              icon sources (SVG) and the base PNGs generated from them
scripts/             generate-app-assets, generate-native-locales, generate-ringtone, verify-offline, run-command (result banners)
store/fastlane/      generated store listings + fastlane lanes that upload them
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
| `npm run store:csv:android` | Export all supported Google Play listings to `store/exports/android.csv`. |
| `npm run store:csv:ios` | Export all supported Apple App Store listings to `store/exports/ios.csv`. |
| `npm run assets` / `assets:check` | Generate / verify app icons, splash screens and web icons ([ASSETS.md](ASSETS.md)). |
| `npm run ringtone` | Re-synthesize the ring tones (no third-party audio) into the Android and iOS plugin resources. |
| `npm run verify:offline` | Check the no-network guarantees. |
| `npm run cap:sync` | Check assets + build + locales + `cap sync`. |
| `npm run android:debug` | Build a debug APK. |

Every npm script ends with a framed result banner on stderr: a green `✅ SUCCESS` for exit code 0 or a red `❌ FAILED` otherwise, with the local time and date (`HH:mm:ss DD/MM/YYYY`). `scripts/run-command.mjs` wraps each external command (`vite`, `vue-tsc`, `cap`, `node`, `npm`, `adb`) without a shell, and the custom scripts import `scripts/lib/cli-failure.mjs` so running them directly is covered too.

- stdout is untouched, so JSON and pipes still work. Color follows the terminal: `NO_COLOR`, `TERM=dumb` and `FORCE_COLOR=0` turn it off, `FORCE_COLOR=1` forces it.
- Success is per command step, not per `&&` chain: a later step can still fail, and a long-running `dev` server reports only when it exits.
- The banner never changes the exit status and never repeats arguments or environment values.

## Uploading store listings

fastlane uploads the listings in `store/fastlane/` (Ruby only, so Windows works; building the iOS app
still needs a Mac). Store API keys stay out of git: the paths below are gitignored, and so is any `.p8`.

1. Ruby 3.3 (`winget install RubyInstallerTeam.RubyWithDevKit.3.3 --source winget`), then
   `bundle config set --local path vendor/bundle` and `bundle install` in `store/`.
2. Keys, or point the environment variable at a key kept outside the repo:
   - **Google Play**: a Google Cloud service account with the Google Play Android Developer API
     enabled, invited in Play Console with access to this app only (Manage store presence, plus Edit
     and delete draft apps while the app is still a draft). Its JSON key goes in
     `store/fastlane/play-service-account.json` (`SUPPLY_JSON_KEY`).
   - **App Store**: an App Store Connect team API key with App Manager access, as fastlane's JSON
     (`key_id`, `issuer_id`, and the `.p8` contents as `key`) in
     `store/fastlane/app-store-connect-api-key.json` (`APP_STORE_CONNECT_API_KEY_PATH`).
3. From `store/`:

```bash
bundle exec fastlane android listing validate:true   # dry run: Google Play checks it, nothing is saved
bundle exec fastlane android listing                 # title, short and full description, every language
bundle exec fastlane android listing_with_images     # also icon, feature graphic + phone screenshots
bundle exec fastlane ios listing                     # name, subtitle, description, keywords, promo text
bundle exec fastlane ios listing_with_images         # also screenshots (replaced) + app previews
```

Play attaches listing edits to a release, so the Android lanes use the newest release on the first
track that has one (production, beta, alpha, internal); pass `track:<name>` to choose. The iOS lanes
write to the App Store version being prepared and never submit it for review. They also send the App
Review notes (`metadata/ios/review_information/notes.txt`); enter the review contact details in App
Store Connect itself, never in this public repo. fastlane can't upload the App Store header and
search results artwork (`store/artwork/ios/<locale>/`): upload each language's pair by hand on the
version page, under *Header and Search Results*, then Save. App Store Connect has no
dry run, but `bundle exec fastlane deliver download_metadata --api_key_path <key json>` checks access
read-only. If Ruby fails with `certificate verify failed` because antivirus HTTPS scanning re-signs
traffic, set `SSL_CERT_FILE` to a PEM bundle of Ruby's `ssl/cert.pem` plus the antivirus root
certificate.

## Testing end to end

- **Android emulator**: install, turn on, grant, then `adb emu sms send 5550100 "<your phrase>"`.
- **Android device**: text the phrase from another phone; lock the device first to see the stop screen.
- **iPhone**: follow the in-app Shortcuts guide; text yourself the phrase.

## Configuration to set before release

- `appId` (`capacitor.config.ts`, Android `applicationId`/`namespace`, iOS bundle id): currently `com.logicedge.smsring`.
- `SOURCE_URL` in `src/app.config.ts`.
- App icons and splash: chosen and generated (`npm run assets`, see [ASSETS.md](ASSETS.md)).

The git pre-commit hook in `.githooks/` checks generated assets and locales before each commit; `npm install` enables it.
