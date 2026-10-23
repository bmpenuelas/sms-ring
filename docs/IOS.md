# iOS

iOS never lets third-party apps read SMS. SMS Ring therefore works with **Apple Shortcuts**:

```
Any message arrives → Shortcuts automation "Message" (any sender, any text; Run Immediately, Notify When Run off)
   → Ring if passphrase matches (SMS Ring)   (our App Intent, gets message + optional sender; returns true if it rang)
        → RingTrigger.handleAutomation → same matcher as Android → RingEngine.start
   → If result is true → Set Volume 100%     (Shortcuts actions)
```

The automation never contains the passphrase: every message goes to the intent, which checks it in memory and forgets it, exactly like the Android receiver. So changing the passphrase needs no change in Shortcuts, and the volume only changes when the phrase matched.

The in-app guide (`IosSetupSheet.vue`) walks through these steps, opens Shortcuts and shows **“Automation worked …”** once the intent has run at least once (`RingStore.recordAutomationRun`, which keeps only the time and the verdict). Any text proves the wiring, so the user can check it without sending the passphrase.

## Code

| File | Role |
|---|---|
| `ios/App/App/RingIntents.swift` | `RingIfPassphraseIntent`, `StopRingingIntent` (both `AudioPlaybackIntent`, `openAppWhenRun = false`) and `SmsRingShortcuts` (Siri: “Stop SMS Ring”). |
| `plugins/remote-ring/ios/Sources/RemoteRingPlugin/RingEngine.swift` | `.playback` audio session (ignores the silent switch), looping tone (the configured one from `Resources/`, at `config.volume` % of the system volume; there is no system alarm sound to read, so that option is hidden), vibration timer, lock-screen media controls (pause = stop, ignored while the phone is locked with a passcode: `isProtectedDataAvailable`), time-sensitive notification. The *Stop ringing* App Intent requires authentication, so Siri asks to unlock first. |
| `…/RingStore.swift` | Config/history/automation-run JSON in Application Support, `completeUntilFirstUserAuthentication`, excluded from backup. |
| `…/MessageMatcher.swift` | Swift port of the matcher. |
| `…/RemoteRingPlugin.swift` | Capacitor bridge (auto-registered by SPM). |

## Project settings

- Deployment target **iOS 17** (`AudioPlaybackIntent`).
- `UIBackgroundModes: audio` so ringing continues after the intent returns.
- Entitlement `com.apple.developer.usernotifications.time-sensitive` so the notification breaks through Focus.
- iPhone only (`TARGETED_DEVICE_FAMILY = 1`), portrait.

## Known limits (platform, not app)

- **Volume**: apps cannot set system volume; the automation's *Set Volume* action does it. Without it, the ring uses the current media volume (still ignoring the silent switch).
- **Vibration** from a background audio session is best-effort; iOS may drop it.
- **Every message runs the automation.** With *Notify When Run* off iOS runs it silently; each run only passes the text to the intent, which needs a few milliseconds.
- **Sender filter** needs the automation to pass *Shortcut Input → Sender*; without it, only “Anyone” works (the intent refuses to ring when senders are restricted and no sender is given).
- Possible future upgrade: **Critical Alerts** entitlement (Apple approval) to ring at full volume even if *Set Volume* is missing.

Tests: `swift test` in `plugins/remote-ring` (macOS) runs the shared matcher vectors.
