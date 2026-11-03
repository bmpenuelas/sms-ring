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
| `npm run store:check` / `store:check:strict` | Check store text limits, image and video sizes, folder names ([below](#uploading-store-listings)). |
| `npm run store -- <android\|ios> <lane>` | Run a fastlane upload lane. |
| `npm run assets` / `assets:check` | Generate / verify app icons, splash screens and web icons ([ASSETS.md](ASSETS.md)). |
| `npm run ringtone` | Re-synthesize the ring tones (no third-party audio) into the Android and iOS plugin resources. |
| `npm run verify:offline` | Check the no-network guarantees. |
| `npm run cap:sync` | Check assets + build + locales + `cap sync`. |
| `npm run android:debug` | Build a debug APK. |
| `npm run native:versions` | Sync package version to native projects, preserving a higher iOS build number. |
| `npm run ios:bump-build-number` | Increment the iOS build number in every Xcode configuration, keeping the package/marketing version (e.g. `1.0.0`). |

For another upload of the same iOS version (TestFlight or an unreleased App Store version), run:

```bash
npm run ios:bump-build-number
npm run cap:sync:open:ios
```

Then archive and upload from Xcode. `ios:bump-build-number` advances the highest existing
`CURRENT_PROJECT_VERSION` across Debug and Release (initially `1000000` → `1000001`).
`Info.plist` already reads it through `CFBundleVersion`, so no separate plist edit is needed.
Subsequent `native:versions` runs preserve that bump. If Xcode or CI uploaded a higher build,
set that number in Xcode first so the next bump exceeds it.

For an update to an already published App Store version, increase the marketing version too.
`npm run release:version` bumps the package patch version and syncs both native projects;
`release:prepare:ios` / `release:prepare:ios:open` also bump that patch version before syncing/building.
Use `cap:sync:open:ios` after a build-only bump to keep `1.0.0`.

Every npm script ends with a framed result banner on stderr: a green `✅ SUCCESS` for exit code 0 or a red `❌ FAILED` otherwise, with the local time and date (`HH:mm:ss DD/MM/YYYY`). `scripts/run-command.mjs` wraps each external command (`vite`, `vue-tsc`, `cap`, `node`, `npm`, `adb`) without a shell, and the custom scripts import `scripts/lib/cli-failure.mjs` so running them directly is covered too.

- stdout is untouched, so JSON and pipes still work. Color follows the terminal: `NO_COLOR`, `TERM=dumb` and `FORCE_COLOR=0` turn it off, `FORCE_COLOR=1` forces it.
- Success is per command step, not per `&&` chain: a later step can still fail, and a long-running `dev` server reports only when it exits.
- The banner never changes the exit status and never repeats arguments or environment values.

## Uploading store listings

fastlane uploads the listings in `store/fastlane/` (Ruby only, so Windows works; building the iOS app
still needs a Mac). Store API keys stay out of git: the paths below are gitignored, and so is any `.p8`.

1. Ruby 3.3 and Bundler (`winget install RubyInstallerTeam.RubyWithDevKit.3.3 --source winget`).
   The first `npm run store -- …` runs `bundle install` into `store/vendor/bundle` for you.
2. Keys. Neither is ever committed, and a `.p8` is ignored anywhere. Point the environment variable
   at the file, or put it at the gitignored default path:
   - **Google Play**: a Google Cloud service account with the Google Play Android Developer API
     enabled, invited in Play Console with access to this app only (Manage store presence, plus Edit
     and delete draft apps while the app is still a draft). Its JSON key:
     `SUPPLY_JSON_KEY=<path>`, default `store/fastlane/play-service-account.json`.
   - **App Store**: an App Store Connect team API key with App Manager access, as fastlane's JSON
     (`key_id`, `issuer_id`, and the `.p8` contents as `key`):
     `APP_STORE_CONNECT_API_KEY_PATH=<path>`, default `store/fastlane/app-store-connect-api-key.json`.

   An App Store Connect key belongs to the team and a Play service account to the developer
   account, so one key can serve several apps (the service account must be invited to each app).
3. From the repo root:

```bash
npm run store:check                                  # text limits, image/video sizes, folder names
npm run store -- android doctor                      # key works; releases on each track
npm run store -- ios doctor                          # key works; the App Store version being prepared

npm run store -- android listing validate:true       # dry run: Google Play checks it, nothing is saved
npm run store -- android listing                     # title, short and full description, every language
npm run store -- android images                      # icon, feature graphic + phone screenshots only
npm run store -- android listing_with_images         # both; add changelogs:true to send release notes
npm run store -- ios listing                         # name, subtitle, description, keywords, promo text
npm run store -- ios screenshots                     # screenshots only (replaced)
npm run store -- ios previews                        # app preview videos only (replaced)
npm run store -- ios listing_with_images             # everything
npm run store -- lanes                               # list the lanes
```

Every upload lane runs `store:check:strict` first and stops on errors; `skip_check:true` skips it and
`strict:false` tolerates content that is still missing. The check wants the icon, feature graphic and
phone screenshots for `en-US` on Google Play and an iPhone set for `en-US` on the App Store (other
languages fall back to those; `--all-locales` requires every language). Options: `validate:true`
(App Store Connect has no dry run, so on iOS it only runs the local check), `confirm:true` (deliver
shows its HTML preview and asks first), `version:1.2.3` (iOS), `track:<name>` and `version_code:<n>`
(Android). `npm run store -- android pull` and `ios pull` download the live listing into
`store/fastlane/downloaded/` (gitignored) to compare with the local files.

Play attaches listing edits to a release, so the Android lanes use the newest release on the first
track that has one (production, beta, alpha, internal); upload a build first. The iOS lanes write
to the App Store version being prepared (create it in App Store Connect first) and never submit it
for review. They also send the App Review notes (`metadata/ios/review_information/notes.txt`);
enter the review contact details in App Store Connect itself, never in this public repo (contact
and demo-account `.txt` files in that folder are gitignored if you want fastlane to send them).
`npm run store:changelog` writes Google Play release notes for the `package.json` version into
`android/<locale>/changelogs/` (from an App Store `release_notes.txt` per language when present, or
`-- --text "<notes>"` for one text), then `android listing_with_images changelogs:true` sends them.
fastlane can't upload the App Store header and search results artwork (`store/artwork/ios/<locale>/`):
upload each language's pair by hand on the version page, under *Header and Search Results*, then Save.
The App Store counts keywords in bytes, not characters, so the check reports languages whose
keywords exceed 100 bytes. If Ruby fails with `certificate verify failed` because antivirus HTTPS
scanning re-signs traffic, set `SSL_CERT_FILE` to a PEM bundle of Ruby's `ssl/cert.pem` plus the
antivirus root certificate.

`scripts/lib/store-specs.mjs` holds every limit and media size (the languages come from
`src/i18n/languages.ts`, so they cannot drift); `tests/store-metadata.test.ts` covers the checks.

## Testing end to end

- **Android emulator**: install, turn on, grant, then `adb emu sms send 5550100 "<your phrase>"`.
- **Android device**: text the phrase from another phone; lock the device first to see the stop screen.
- **iPhone**: follow the in-app Shortcuts guide; text yourself the phrase.

## Configuration to set before release

- `appId` (`capacitor.config.ts`, Android `applicationId`/`namespace`, iOS bundle id): currently `com.logicedge.smsring`.
- `SOURCE_URL` in `src/app.config.ts`.
- App icons and splash: chosen and generated (`npm run assets`, see [ASSETS.md](ASSETS.md)).

The git pre-commit hook in `.githooks/` checks generated assets and locales before each commit; `npm install` enables it.
