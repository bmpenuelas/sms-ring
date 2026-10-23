# Android

Code: `plugins/remote-ring/android/src/main/java/app/smsring/remotering/`.

| Class | Role |
|---|---|
| `SmsReceiver` | Manifest receiver for `SMS_RECEIVED`, guarded by `BROADCAST_SMS`. Joins multipart bodies, evaluates, never stores bodies. |
| `MessageMatcher` | Java port of `src/core/matcher.ts`. |
| `RingConfig` / `RingStore` | Sanitized config + local history (max 20, masked senders) in private `SharedPreferences`. |
| `RingController` | Single entry to start/stop. Handles the background-start fallback. |
| `RingService` | Foreground service (`mediaPlayback`): alarm stream at max, looping tone, vibration (`USAGE_ALARM`), wake lock, timer. Restores volume and DND on stop. |
| `ChatNotificationListener` | Optional “Ring from chat apps”: checks the newest message of incoming notifications (WhatsApp, Messenger, RCS…) with the same matcher. Off unless `config.chatApps` and Notification access are both on. |
| `HealthCheck` | Daily `JobScheduler` job: posts “SMS Ring can't ring right now” if SMS access, the unused-apps exemption or Notification access (when needed) went missing. |
| `OemAutostart` | Finds the phone maker's autostart screen, if any. |
| `RingTones` | Maps the configured tone to a player: bundled `res/raw` tones, or `"system"` = the phone's alarm sound (`RingtoneManager.TYPE_ALARM`), falling back to the default tone if it can't be read. |
| `RingActivity` | Native stop screen over the lock screen (`showWhenLocked`, `turnScreenOn`). With a secure lock, Stop first asks to unlock (`requestDismissKeyguard`, Android 8+). |
| `RingNotifications` | Two channels: `remote_ring_active` (silent, service plays audio) and `remote_ring_fallback` (channel sound). |
| `RemoteRingPlugin` | Capacitor bridge: config, capabilities, test ring, history, platform proof. |

## Starting from the background

Android 12+ may refuse to start a foreground service from the background. Order of defence:

1. **Battery-optimization exemption** (recommended capability): exempt apps can start foreground services from the background.
2. If refused anyway (`ForegroundServiceStartNotAllowedException`), a **full-screen alarm notification** is posted. Its channel rings immediately; when the stop screen opens it starts the full ringer (an activity in the foreground may start the service).
3. **Full-screen intent** permission (Android 14+) makes that screen appear over the lock screen.

## Volume and Do Not Disturb

- Audio uses `USAGE_ALARM` on `STREAM_ALARM`, raised to max and restored afterwards. Alarms ring in silent/vibrate mode and in most DND modes.
- `overrideDnd` (**on by default**, needs Notification Policy access): if DND is *Total silence*, switch to *Alarms only* while ringing, then restore. Without access it has no effect; alarms still ring in the other DND modes.

## Ringing in every condition

- **Never opened since boot**: `SmsReceiver` is a manifest receiver, so Android delivers `SMS_RECEIVED` without the app running. Only a **Force stop** (or some phone makers' “clean up”) blocks it until the app is opened again.
- **Before the first unlock after a reboot**: the receiver, service, stop screen and stop receiver are `directBootAware`, and `RingStore` keeps the config and history in device-protected storage (moved there from the old location on first unlock). Trade-off: the passphrase is readable by the OS before that first unlock; it never leaves the phone and backups exclude it. The “Alarm sound” tone may be unreadable before unlock and falls back to the default tone.
- **Screen off / Doze**: SMS delivery wakes the phone; `RingService` holds a wake lock for the ring.
- **Months without opening the app** (Android 11+ hibernation): the `unusedApps` capability asks the user to exempt it, otherwise Android removes its permissions.
- **Phone makers' killers**: the `autostart` capability opens the maker's own switch (see dontkillmyapp.com).
- **Something turned off later**: `HealthCheck` warns with a notification once a day (repeating an unchanged warning every 3 days at most), and the warning clears itself when the app next opens with everything fixed. It needs `RECEIVE_BOOT_COMPLETED` only so the job survives reboots.
- **Chat apps / RCS**: texts sent as RCS chat messages are not SMS, so `SmsReceiver` never sees them. With “Ring from chat apps” on, `ChatNotificationListener` catches them from the notification instead. When an allowed-senders list is set, a notification only counts if its sender name matches an entry (chat apps show contact names, not numbers). On Android 13+, sideloaded builds must allow “restricted settings” before Notification access can be granted; Play installs aren't affected.

## Only the owner can stop it

While the phone is locked with a PIN, pattern, password or biometric (`RingController.isLockedSecurely`), nothing stops ringing until it is unlocked:

- **Stop screen**: Stop calls `requestDismissKeyguard`; ringing stops only on `onDismissSucceeded`. Android 7 can't show the prompt from here, so it stops directly.
- **Notification Stop button**: `setAuthenticationRequired(true)` makes Android 12+ ask to unlock first. On older versions `StopRingReceiver` opens the stop screen instead of stopping.
- **Swiping the notification away** on the lock screen is ignored.

Without a secure lock (none or swipe) Stop works directly, as there is nothing to unlock.

## Volume

`config.volume` (10–100 %, default 100) sets the alarm stream to that share of its maximum while ringing; the previous volume is restored afterwards.

## Tones

Five synthesized tones ship in `res/raw` (`npm run ringtone`); `remote_ring_tone` is the default and the fallback channel's sound. “Alarm sound” plays the user's own alarm sound, read through `RingtoneManager` (no storage permission needed). Previews in the tone sheet play at the current alarm volume for 4 s and never raise it.

## Permissions (manifest)

`RECEIVE_SMS`, `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE(_MEDIA_PLAYBACK)`, `WAKE_LOCK`, `VIBRATE`, `MODIFY_AUDIO_SETTINGS`, `USE_FULL_SCREEN_INTENT`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, `ACCESS_NOTIFICATION_POLICY`, `RECEIVE_BOOT_COMPLETED` (keeps the daily check scheduled). Notification access is not a manifest permission: the listener service is bound by the system only after the user grants it in settings.
`<queries>` lists the phone makers' settings packages so their autostart screens can be found on Android 11+.
`INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE` are **removed** (`tools:node="remove"`) in both the plugin and app manifests.

## Google Play policy notes

- `RECEIVE_SMS` is a restricted permission: submit the *Permissions Declaration Form*. The closest permitted use case is device-finding/anti-loss triggered by user-configured SMS; be ready to show the in-app explanation screen and video.
- `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` must be justified (core function: ring instantly when a message arrives).
- `USE_FULL_SCREEN_INTENT` is granted by default only to calling/alarm apps on Android 14+; the app asks via settings when needed.

## Testing on an emulator

```bash
adb emu sms send 5550100 "hello daisy meadow rocket"
```

Unit tests (shared vectors): `cd android && ./gradlew :capacitor-remote-ring:testDebugUnitTest`.
