# Store artwork

Screenshots, the Google Play feature graphic and the App Store header and search artwork, in all
20 app languages, from one design (style B, "Keycap Pop").

| File | What it is |
|---|---|
| `base.html` | The 8 store screenshots as one panorama. `?lang=<code>&platform=android\|ios` |
| `promo.html` | `?kind=feature\|header\|search&lang=<code>`: the Play feature graphic and the App Store header and search results artwork, one layout |
| `copy.js` | Every word on the artwork, per language. `\n` is a line break; headlines shrink to fit |
| `keycap.css`, `motifs.js` | Shared look: stickers, the icon's bell, the message with a hidden secret |
| `kit.css`, `kit.js` | Canvas, CSS phone frames, text fitting |
| `caps/<code>/` | Real app screens per language, plus `meta.js` (where the outlined parts sit) |
| `preview.mjs` | The App Store app preview video, recorded from the real app with captions |

Slot 7 is "rings from chat apps" on Android and "speaks your language" on iOS, because only Android
can read chat notifications.

## Regenerate

None of the generated files are in git (see `.gitignore`): the store images, the video, `caps/`
and `out/`. Everything comes back from the sources here and the app itself.

You need Node 24 (the scripts import the app's `.ts` locale files directly), `npm install` (for
`sharp`), Edge or Chrome, and network access for Google Fonts (Unbounded, Inter Tight and the Noto
fallbacks for Arabic, Devanagari, Thai, Japanese, Korean and Chinese). The video also needs ffmpeg
and adb.

### Screenshots and artwork

```bash
npm run dev                                 # in another terminal; the web preview on port 5180
node design/store-screenshots/capture.mjs   # app screens per language into caps/
node design/store-screenshots/build.mjs     # store images
```

`capture.mjs` drives the web preview (seeding the simulated plugin's localStorage) and saves each
screen in each language, using that language's own passphrase words. `build.mjs` renders the pages
with headless Edge or Chrome and writes:

| Output | Size |
|---|---|
| `store/fastlane/metadata/android/<locale>/images/phoneScreenshots/1..8.png` | 1080×1920 |
| `store/fastlane/metadata/android/<locale>/images/featureGraphic.png` | 1024×500 |
| `store/fastlane/screenshots/<locale>/1..8_iphone63.png` | 1206×2622 |
| `store/artwork/ios/<locale>/header.png`, `search-results.png` | 3840×1646 (21:9), 3840×2560 (3:2) |
| `store/fastlane/previews/<locale>/app-preview_iphone_67.mp4` (`preview.mjs`) | 886×1920, 24 s, 30 fps |

Both scripts take a comma-separated language list (`capture.mjs de,ja`); `build.mjs` also takes the
targets first (`build.mjs android,promo de`). Contact sheets for review go to `out/`.

### App preview video

`preview.mjs [lang]` records the real app on an Android phone through a 24-second storyboard (a
text arrives, the phone rings, privacy, the message simulator) under style B captions. It drives
the app's WebView over adb, hides the system bars, and records with the phone's own screen
recorder (up to 120 fps), so motion is exactly as smooth as on the device. The phone really rings
during the take, at low volume. Captions exist in English only so far.

Connect a phone with USB or wireless debugging (`adb devices` lists it), then install the debug
build. Debug builds use the ID `com.logicedge.smsring.debug`, so they sit next to the store app
without touching its settings:

```bash
npm run build && npx cap sync android
cd android && ./gradlew installDebug && cd ..
```

Give the debug app what it needs to say it is listening (once per install):

```bash
adb shell pm grant com.logicedge.smsring.debug android.permission.RECEIVE_SMS
adb shell pm grant com.logicedge.smsring.debug android.permission.POST_NOTIFICATIONS
adb shell cmd notification allow_dnd com.logicedge.smsring.debug
adb shell dumpsys deviceidle whitelist +com.logicedge.smsring.debug
adb shell appops set com.logicedge.smsring.debug AUTO_REVOKE_PERMISSIONS_IF_UNUSED ignore
```

Then, with the phone unlocked:

```bash
node design/store-screenshots/preview.mjs en
```

The debug app listens for the storyboard's passphrase afterwards; `adb uninstall
com.logicedge.smsring.debug` removes it.
