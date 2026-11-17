# Development

Requirements: Node >=22.18, JDK 21 + Android SDK 36 (Android), Xcode 16+ on macOS (iOS).

## Layout

```
src/                 Vue app (core/, state/, ui/, i18n/, services/)
plugins/remote-ring/ local Capacitor plugin (npm workspace): TS API, Android (Java), iOS (Swift, SPM)
android/ ios/        Capacitor platform projects (committed)
assets/              icon sources (SVG) and the base PNGs generated from them
scripts/             generate-app-assets, generate-native-locales, generate-ringtone, verify-offline, plus small application-owned native recipes
store/fastlane/      generated listing data; shared lanes and gems come from rds
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
| `npm run android:start-adb` | Start ADB through `rds android start-adb`, using the configured SDK/environment without choosing or installing a device. |
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

## Shared automation and local policy

The development dependency `reusable-dev-scripts` supplies `rds`. The npm release is pinned to `0.2.0` in the manifest and lockfile. Run `npm ci` for a clean install; no sibling checkout or global tool is required. To update intentionally, install an explicitly selected version with `npm install --save-dev --save-exact reusable-dev-scripts@<version>` and review both dependency files. `reusable-dev-scripts.config.mjs` owns app IDs, locale mappings, the local hooks and the explicit external-credential opt-in.

- Vue builds, Capacitor sync/open, native version synchronization, Gradle/ADB mechanics, CSV exports, store validation/changelogs, pinned Fastlane and result banners use rds. `android:start-adb` now calls the typed `rds android start-adb` command instead of generic `rds exec -- adb start-server`; it honors the configured SDK and production guard. Add `-- --dry-run` to preview without starting the daemon.
- Artwork composition/splash rewriting, the multi-target locale/Xcode/store-copy generator, ring tones, iOS setup images and offline verification stay local. The `capacitor.afterBuild` hook keeps web compilation before locale generation and native sync. Generators are not silently replaced with generic versions.
- `scripts/native-workflow.mjs` keeps this app's release policy: bump once, update BOTH native projects, sync the selected platform, verify offline behavior before a release Gradle build, then reveal the artifact. Debug/install recipes do not bump. Every step delegates to rds.
- Release preparation aliases intentionally bump; retry the same release with `npm run cap:sync:android` and `npm exec -- rds android build --configuration release --format aab --reveal` after the offline check, rather than bumping again. Add `-- --dry-run` to the named native recipes to plan every step without changing versions or building.
- `npm run android:install -- --device <serial>` syncs, builds debug and installs on a physical device. The debug APK adds `.debug` to the release ID, so `android.appId` is `com.logicedge.smsring.debug` for package verification and explicit replacement. It installs alongside the store app (`com.logicedge.smsring`) with separate settings/data; release, Capacitor and store IDs remain unchanged. Multiple devices require an explicit selection. `--replace` is never implicit and clears only the configured debug package after approval, not the store app. The obsolete `--build-script` installer option is no longer supported; use explicit sync/build commands for a custom recipe. If installation succeeded but verification queried the unsuffixed release ID, correct the config; do not uninstall the store app or rebuild just to repeat verification.
- CSV exports still default to `store/exports/android.csv` and `ios.csv`; custom paths now use `-- --output exports/custom.csv`, relative to `store/`, and cannot escape the project.

rds prints one timestamped result per invocation on stderr (ISO UTC): SUCCESS, FAILED, or PLAN COMPLETE for dry-run. Help/version stay clean; nested rds calls leave the banner to their owner. Set `output: { banners: false }` in the config, `RDS_BANNERS=0` in CI, or pass `--no-banner`. `--banner` overrides disabled settings. Ordinary diagnostics remain enabled. Direct `node` invocations of the product generators use normal Node diagnostics; use npm aliases for banners. The no-op compatibility reporter and its imports have been removed. Its asset-generator fingerprint was updated only after the previous asset check passed and the generator change was verified to be exactly the removal of that inert import; no artwork was regenerated. Superseded helper implementations have been removed.

## Uploading store listings

fastlane uploads the listings in `store/fastlane/` (Ruby only, so Windows works; building the iOS app
still needs a Mac). Store API keys stay out of git: the paths below are gitignored, and so is any `.p8`.

1. Ruby 3.3 and Bundler (`winget install RubyInstallerTeam.RubyWithDevKit.3.3 --source winget`).
   The first `npm run store -- …` runs `bundle install` into `.rds/gems` for you.
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

Every upload lane runs strict scoped validation first and stops on errors; the old
`skip_check:true` and `strict:false` bypasses are deliberately rejected. App-owned offline verification also runs before uploads. The check wants the icon, feature graphic and
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

The pinned toolkit owns store limits and media rules. Locale mappings come from `src/i18n/languages.ts` via the config. Store tests exercise the installed CLI against isolated fixtures, not copied validators. `.rds/` is ignored.

Authenticated Fastlane operations now use shared rds lanes and `.rds/gems`; copied wrappers, Fastfiles, Appfile and gem manifests/lockfiles were removed. Existing key environment variables retain their old store-relative interpretation; absolute overrides remain absolute and are never copied into the checkout. The config explicitly enables `store.allowExternalCredentials` for `playKey` and `appleKey` only. Relative traversal and every output/cleanup path remain contained. Configuration and dry-run do not open key contents.

For local-only planning use `npm exec -- rds store run --dry-run -- android listing`. `validate:true` on Android contacts the store and still requires operator approval. Shared lanes additionally expose internal binary uploads, never public rollout or review submission; the app-owned offline hook runs before any upload. No authenticated lane was executed during migration.

## Testing end to end

- **Android emulator**: install, turn on, grant, then `adb emu sms send 5550100 "<your phrase>"`.
- **Android device**: text the phrase from another phone; lock the device first to see the stop screen.
- **iPhone**: follow the in-app Shortcuts guide; text yourself the phrase.

## Configuration to set before release

- `appId` (`capacitor.config.ts`, Android `applicationId`/`namespace`, iOS bundle id): currently `com.logicedge.smsring`.
- `SOURCE_URL` in `src/app.config.ts`.
- App icons and splash: chosen and generated (`npm run assets`, see [ASSETS.md](ASSETS.md)).

The git pre-commit hook in `.githooks/` checks generated assets and locales before each commit; `npm install` enables it.

## Shared recipe extensions

The project pins `reusable-dev-scripts@0.2.0` from npm; clean installs need no sibling checkout. For toolkit development, temporarily use `npm install --save-dev --install-links=false ../dev-scripts --ignore-scripts` and rebuild that checkout after changes. Return to the registry dependency with `npm install --save-dev --save-exact reusable-dev-scripts@0.2.0 --ignore-scripts` and update the lockfile. The ignore-scripts flag applies only to these narrow dependency-update commands, not normal project setup or rds hooks.

`capacitor.afterBuild` runs the app-owned locale generator after each successful default Vue build and before sync/copy, preserving the existing build → locales → native sync order. It is skipped with `--skip-build`. The former `scripts/build-native.mjs` wrapper is no longer needed. `scripts/native-workflow.mjs` imports the toolkit’s `runSteps` with an explicit project working directory; local process-launching code is removed. Release/version/offline verification and device-replacement policies are unchanged.

### Remaining migration audit

The ADB alias migration works with the existing pinned toolkit; it needs no dependency update or app version bump. The remaining aliases were checked against both the installed command contract and newer shared command families:

| Candidate | Disposition |
| --- | --- |
| Android bundle, APK, debug, install and release preparation | Already delegate versioning, sync, Gradle and ADB to RDS through the app-owned recipe. Preserve both-platform version ownership, offline verification, ordering and device/replace options. |
| App assets | Retain local SVG composition, adaptive-icon sizing, splash repainting, web/store outputs, compression and source fingerprint checks; generic Capacitor assets are not a complete replacement. |
| Locales | Retain the catalogue adapter, Android app/plugin strings and locale declaration, iOS plist/Xcode resource registration and store-listing generation; generic native strings would omit work. |
| Ringtones, iOS setup images and offline verification | Retain app-specific media generation and security policy. |
| Dev, preview, typecheck and tests | Existing tool invocations need no new orchestration. Concurrent dev, TCP readiness, environment generation and Prisma commands have no matching multi-service/database workflow here. |
| Git-hook setup | Retain local project policy; do not replace it with build/release automation. |

The migration audit did not require a dependency upgrade or validate live ADB, native builds, signing, uploads or Explorer behavior. After local toolkit testing, the project now pins the published npm `0.2.0` snapshot, including the Windows reveal fixes; it no longer needs the sibling checkout for normal use. Further edits in a toolkit checkout still require an intentional dependency update or a temporary development link.
