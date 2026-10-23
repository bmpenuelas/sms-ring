# Architecture

```
┌──────────────────────── Web UI (Vue 3, in the app bundle) ─────────────────────────┐
│ ui/home/         the home screen (presentation only)                               │
│ ui/              shared sheets: permission explainer, privacy, passphrase, …       │
│ state/app.ts     single store: config, capabilities, ring state, actions           │
│ core/            pure TS: normalize, matcher, passphrase, config (unit-tested)     │
│ i18n/            20 catalogues + 20 word lists, loaded on demand                   │
└───────────────────────────────┬────────────────────────────────────────────────────┘
                                │ Capacitor bridge (in-process, no network)
┌───────────────────────────────▼────────────────────────────────────────────────────┐
│ plugins/remote-ring  (local Capacitor plugin, npm workspace)                       │
│   src/definitions.ts   the contract        src/web.ts   browser simulator          │
│   android/  SmsReceiver → RingController → RingService (+ RingActivity stop screen)│
│   ios/      RingTrigger → RingEngine (AVAudioSession .playback) ; RingStore        │
└────────────────────────────────────────────────────────────────────────────────────┘
  ios/App/App/RingIntents.swift   App Intents called by the Shortcuts automation
```

## Principles

- **The UI only renders.** The home screen and the ringing overlay call `useView()` (`src/ui/useView.ts`), which wraps `useRingApp()`. Behavior lives in `state/` and `core/`, so the UI can change without touching logic.
- **One source of truth for matching.** `src/core/matcher.ts` is mirrored line by line in Java and Swift; the shared vectors in `plugins/remote-ring/test-fixtures/matching.json` run on all three ([MATCHING.md](MATCHING.md)).
- **Native owns anything that must work while the app is closed**: receiving the SMS, ringing, the stop screen, config storage. The web layer only edits configuration.
- **The plugin is reusable.** `capacitor-remote-ring` has no app-specific UI or copy; strings come from generated resources.

## Plugins vs native code

| Need | Choice | Why |
|---|---|---|
| Receive SMS while app is closed | **Native** (manifest `BroadcastReceiver`) | No plugin can run a receiver with the app killed. |
| Ring at max volume for N seconds | **Native** foreground service / `AVAudioSession` | Needs alarm stream, wake lock, FGS type, DND handling, restore of user volume. |
| Lock-screen stop UI | **Native** `RingActivity` | Must appear instantly without booting a WebView. |
| iOS trigger | **Native** App Intents (`AudioPlaybackIntent`) | Only way to run from a Shortcuts automation and start audio in the background. |
| Config storage | **Native** (`SharedPreferences` / Application Support file) | Must be readable by the receiver/intent without the WebView; excluded from backups. |
| Haptics, clipboard, share sheet, status bar, app resume | **Official Capacitor plugins** | Thin, complete, no limitations for these uses. |

## Data flow: an SMS arrives (Android)

1. Android delivers `SMS_RECEIVED` to `SmsReceiver` (only the system may send it: `BROADCAST_SMS`).
2. Config is read from app-private storage; if not armed, stop.
3. Multipart bodies are joined per sender; `MessageMatcher.evaluate` decides.
4. On `RING`, `RingController.start` starts `RingService` (or falls back to a full-screen alarm notification, see [ANDROID.md](ANDROID.md)).
5. `RingState` notifies the plugin, which emits `ringStateChange` to the UI if it is open.

## Data flow: iPhone

Shortcuts automation (`Message contains <phrase>`) → `RingIfPassphraseIntent` → `RingTrigger.handleAutomation` (same matcher) → `RingEngine.start`. See [IOS.md](IOS.md).
