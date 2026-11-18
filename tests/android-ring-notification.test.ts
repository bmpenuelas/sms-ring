import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const root = '../plugins/remote-ring/android/src/main/'
const read = (path: string) => readFile(new URL(`${root}${path}`, import.meta.url), 'utf8')

// Source-contract checks: native notification behavior still needs a locked-device
// test, but don't allow the known full-screen suppression flag to return.
test('ringing notification remains eligible for immediate full-screen display', async () => {
  const source = (await read('java/com/logicedge/smsring/remotering/RingNotifications.java'))
    .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, '')
  assert.doesNotMatch(source, /\.setSilent\s*\(/u)
  assert.doesNotMatch(source, /\.setGroupAlertBehavior\s*\(/u)
  assert.match(source, /\.setFullScreenIntent\(screenIntent, true\)/u)
  assert.match(source, /\.setForegroundServiceBehavior\(NotificationCompat\.FOREGROUND_SERVICE_IMMEDIATE\)/u)
  assert.match(source, /NotificationManager\.IMPORTANCE_HIGH/u)
  assert.match(source, /active\.setSound\(null, null\)/u)
  assert.match(source, /active\.enableVibration\(false\)/u)
  // Android 7 uses the notification fields rather than channel settings. Keep
  // them silent on the service path so removing setSilent doesn't double-play.
  assert.match(source, /boolean servicePlaysTone = CHANNEL_ACTIVE\.equals\(channel\)/u)
  assert.match(source, /\.setSound\(servicePlaysTone \|\| vibrateOnly \? null : toneUri\(context\)\)/u)
  assert.match(source, /\.setVibrate\(!servicePlaysTone && startServiceFromScreen \? RingService\.VIBRATION_PATTERN : null\)/u)
})

test('ringing activity can turn on the screen without dismissing the secure lock', async () => {
  const manifest = await read('AndroidManifest.xml')
  const activity = manifest.match(/<activity\s+android:name="\.RingActivity"[\s\S]*?\/>/u)?.[0]
  assert.ok(activity)
  assert.match(activity, /android:showWhenLocked="true"/u)
  assert.match(activity, /android:turnScreenOn="true"/u)
  const source = await read('java/com/logicedge/smsring/remotering/RingActivity.java')
  assert.match(source, /keyguard\.requestDismissKeyguard\(this,/u)
  assert.match(source, /void onDismissSucceeded\(\)\s*\{\s*stopNow\(\)/u)
})
