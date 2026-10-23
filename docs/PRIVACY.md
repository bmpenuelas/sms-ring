# Privacy model

**Claim:** SMS Ring cannot send data anywhere. Each layer enforces it independently:

| Layer | Mechanism | Verify |
|---|---|---|
| Android OS | No `INTERNET` permission; removed with `tools:node="remove"` even if a library adds it. Sockets fail with `EACCES`. | Settings → Apps → SMS Ring → Permissions; `aapt dump permissions app.apk`; in-app *Live check* reads the installed package's permissions. |
| Web view | Production CSP: `connect-src 'none'`, `default-src 'self'`, no remote scripts/fonts/frames. | `dist/index.html` |
| Our code | No networking APIs (fetch, XHR, WebSocket, beacons, `URLSession`, `HttpURLConnection`, …). | `npm run verify:offline` |
| Assets | Fonts, sounds and icons are bundled; nothing is loaded from a CDN. | `vite.config.ts` (`assetsInlineLimit`), `@fontsource/*` packages |
| Backups | Android `allowBackup=false` + data-extraction rules exclude everything; iOS files flagged `isExcludedFromBackup`. | `AndroidManifest.xml`, `data_extraction_rules.xml`, `RingStore.swift` |
| iOS | No networking code; Apple's App Privacy label: *Data Not Collected*. iOS has no per-app internet switch, so this one relies on code review. | Source + `verify:offline` |

## What is stored, where

| Data | Where | Notes |
|---|---|---|
| Config (armed, phrase, allowed senders, duration, volume, tone, vibrate, DND, chat apps) | Android private `SharedPreferences` in device-protected storage (readable before the first unlock after a reboot, so it can ring then); iOS Application Support file | Needed by the ringer when the app is closed. |
| Ring history (≤ 20) | Same | Time, reason and **masked** sender (`•••• 1234`) only. Clearable. |
| UI preferences (language, word count, light/dark) | Web view local storage | No personal data. |
| Message bodies | **Nowhere** | Checked in memory and discarded. |
| Chat-app notifications (optional) | **Nowhere** | Same as messages: the newest message text is checked in memory and discarded. History records only the app's name. |

## Opening links

“Source code” opens the **system browser**; the app itself makes no connection. Sharing the phrase uses the system share sheet, so the user chooses the destination.

## In the UI

Every surface carries the promise: a `PrivacySeal` (badge, rotating stamp or line), each permission explainer has a *How your privacy stays safe* panel, the stop screen footer says “Checked on this phone. Nothing was sent anywhere.”, and the privacy sheet runs the live permission check.
