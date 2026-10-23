# Permission flow: explain first, then ask

Rule: **no system permission dialog or settings page is ever shown without our explanation first and an explicit tap on “Allow”.**

```
user action (turn on / checklist row)
  → actions.askCapability(name)           state/app.ts
      → explainCapability(name)           state/sheets.ts  (opens PermissionSheet)
          PermissionSheet: animated scene + why + “How your privacy stays safe”
          [Not now] → resolves false, nothing shown
          [Allow]   → actions.grantFromSheet(name)
                        → RemoteRing.requestCapability   (system dialog / settings page)
                        or RemoteRing.openSettings       (if permanently denied)
```

`RemoteRing.requestCapability` is called from exactly one place (`grantFromSheet`). Grep for it to audit.

## Capabilities

| Name | Android mechanism | iOS | Importance |
|---|---|---|---|
| `sms` | `RECEIVE_SMS` runtime dialog | n/a (Shortcuts) | required |
| `notifications` | `POST_NOTIFICATIONS` dialog (13+), else settings | `UNUserNotificationCenter` dialog | recommended |
| `battery` | `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` dialog | n/a | recommended |
| `fullScreen` | Android 14+ settings page | n/a | recommended (only exists on Android 14+, hidden below) |
| `dnd` | Notification-policy settings page | n/a | recommended while “Ring through DND” is on (**on by default**); dropped when it's off |
| `unusedApps` | Android 11+ “Pause app activity if unused” switch (`ACTION_AUTO_REVOKE_PERMISSIONS`); read with `isAutoRevokeWhitelisted()` | n/a | recommended; without it Android removes the permissions of an app that isn't opened for months |
| `autostart` | The phone maker's own autostart screen (`OemAutostart`: Xiaomi, Huawei, Honor, Oppo, Realme, OnePlus, Vivo, Asus…) | n/a | recommended where it exists; it can't be read, so it counts as granted once the user has opened it |
| `notificationAccess` | Notification-listener settings page | n/a | optional; only while “Ring from chat apps” is on (off by default). If the user declines, the switch goes back off |

States: `granted`, `prompt`, `blocked` (denied for good: the sheet says so and its button opens Settings), `unsupported` (hidden).

## Minimal setup

SMS Ring is **on by default** and the phrase is generated automatically, so setup is only permissions: on Android, SMS, notifications, background, keep-when-unused (11+), the phone maker's autostart switch (where there is one), lock-screen display (14+) and DND access (while “Ring through DND” is on); on iPhone, notifications plus the Shortcuts automation.

- The home screen shows `Finish setup · n` while something is missing. It runs `runSetup()`: one explainer per item, labeled “Step 1 of n”.
- Declining a recommended item skips it (`prefs.skipped`) so setup doesn't nag; it stays in the checklist. Declining the required one stops.

## Asking again when a feature needs it

Each feature lists what it needs (`NEEDS` in `src/state/app.ts`): a **test ring** needs SMS, notifications and lock-screen display; **turning the ringer on** needs all of them. Before the feature runs, `askForFeature()` shows the explainer for anything still missing, including items skipped in setup, once per app session so repeated taps don't nag. The test rings anyway afterwards. Turning on “Ring through DND” asks for DND access the same way.

## SMS refused

If SMS access is blocked, or was declined in an explainer (`prefs.smsDeclined`), the home screen shows a red-orange alert at the top: the app can't work without it, so the phone won't ring. Its button asks again (or opens Settings when Android won't show the dialog any more). It disappears once access is granted.
- The checklist sheet lists everything with its state and lets the user retry any item.
- Capabilities are re-read on app resume, so returning from Settings updates the UI.
