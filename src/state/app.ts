// The app's single source of truth. The UI reads state and calls actions from
// useRingApp(); it never talks to the native plugin directly.

import { App as CapApp } from '@capacitor/app'
import {
  RemoteRing,
  type CapabilityName,
  type CapabilityStatus,
  type PlatformInfo,
  type RingConfig,
  type RingState,
  type TriggerRecord,
} from 'capacitor-remote-ring'
import { computed, reactive, readonly, ref, watch } from 'vue'

import {
  DURATION_STEPS,
  MAX_SENDERS,
  MAX_VOLUME,
  MIN_VOLUME,
  TONES,
  defaultConfig,
  sanitizeConfig,
  type ToneId,
} from '../core/config'
import { evaluateMessage, MIN_NORMALIZED_PASSPHRASE } from '../core/matcher'
import { normalizePhrase } from '../core/normalize'
import { MAX_WORDS, MIN_WORDS, entropyBits, generateWords, splitWords } from '../core/passphrase'
import { language, loadWords, t, type LanguageCode } from '../i18n'
import { haptic, platform, shareText, copyText } from '../services/device'
import { prefs } from './prefs'
import type { ThemeChoice } from './theme'
import { explainCapability, onSheetClosed, openSheet, setupProgress, topSheet } from './sheets'

export type Importance = 'required' | 'recommended' | 'optional'

export interface ChecklistItem {
  name: CapabilityName
  importance: Importance
  granted: boolean
  blocked: boolean
}

/**
 * Which capabilities matter on each platform, in the order setup asks them.
 * Setup walks through every required and recommended one; declining a
 * recommended one skips it there, and it is asked again when a feature needs it.
 * Lock-screen display only exists on Android 14+, "unused apps" on 11+, and
 * the autostart switch only on phones whose maker adds one; DND access only
 * matters while "Ring through Do Not Disturb" is on, and Notification access
 * only while "Ring from chat apps" is on (each is dropped otherwise).
 */
const ANDROID_PLAN: { name: CapabilityName; importance: Importance }[] = [
  { name: 'sms', importance: 'required' },
  { name: 'notifications', importance: 'recommended' },
  { name: 'battery', importance: 'recommended' },
  { name: 'unusedApps', importance: 'recommended' },
  { name: 'autostart', importance: 'recommended' },
  { name: 'fullScreen', importance: 'recommended' },
  { name: 'dnd', importance: 'recommended' },
  { name: 'notificationAccess', importance: 'optional' },
]
const PLAN: Record<'android' | 'ios' | 'web', { name: CapabilityName; importance: Importance }[]> = {
  android: ANDROID_PLAN,
  ios: [{ name: 'notifications', importance: 'recommended' }],
  web: ANDROID_PLAN,
}

/** What the daily "can't ring" check looks at (Android; see HealthCheck.java). */
const HEALTH_CHECKED: CapabilityName[] = ['sms', 'unusedApps', 'notificationAccess']

/** What each feature needs to work fully; asked when the feature is used. */
const NEEDS = {
  test: ['sms', 'notifications', 'fullScreen'],
  arm: ['sms', 'notifications', 'battery', 'unusedApps', 'autostart', 'fullScreen', 'dnd', 'notificationAccess'],
} satisfies Record<string, CapabilityName[]>

// ---- State ----

const config = ref<RingConfig>(defaultConfig())
const loaded = ref(false)
const capabilities = ref<CapabilityStatus>({
  sms: 'prompt',
  notifications: 'prompt',
  fullScreen: 'unsupported',
  battery: 'unsupported',
  dnd: 'unsupported',
  unusedApps: 'unsupported',
  autostart: 'unsupported',
  notificationAccess: 'unsupported',
})
const platformInfo = ref<PlatformInfo & { lastAutomationRun?: { at: number; verdict: string } }>({
  platform,
  triggerMode: platform === 'ios' ? 'shortcuts' : platform === 'android' ? 'sms' : 'simulated',
  declaredPermissions: [],
  hasInternetPermission: null,
  osVersion: '',
})
const ring = ref<RingState>({ ringing: false })
const history = ref<TriggerRecord[]>([])
const words = ref<readonly string[]>([])
const now = ref(Date.now())

const wordLanguage = computed<LanguageCode>(() => (prefs.wordLanguage === 'auto' ? language.value : prefs.wordLanguage))

// ---- Derived ----

const passphraseWords = computed(() => splitWords(config.value.passphrase))
const passphraseValid = computed(() => normalizePhrase(config.value.passphrase).length >= MIN_NORMALIZED_PASSPHRASE)
const strengthBits = computed(() => {
  if (!prefs.customPassphrase && words.value.length) return entropyBits(words.value.length, passphraseWords.value.length)
  // Typed phrases: a cautious estimate of ~4.7 bits per letter, capped.
  return Math.min(80, normalizePhrase(config.value.passphrase).length * 2.5)
})
const strengthLevel = computed<'fair' | 'good' | 'strong' | 'excellent'>(() => {
  const b = strengthBits.value
  return b < 18 ? 'fair' : b < 26 ? 'good' : b < 34 ? 'strong' : 'excellent'
})

const checklist = computed<ChecklistItem[]>(() =>
  PLAN[platform]
    .filter((p) => capabilities.value[p.name] !== 'unsupported')
    // DND access only matters while "Ring through Do Not Disturb" is on.
    .filter((p) => p.name !== 'dnd' || config.value.overrideDnd)
    // Notification access only matters while "Ring from chat apps" is on.
    .filter((p) => p.name !== 'notificationAccess' || config.value.chatApps)
    .map((p) => ({
      ...p,
      granted: capabilities.value[p.name] === 'granted',
      blocked: capabilities.value[p.name] === 'blocked',
    })),
)
const missingRequired = computed(() => checklist.value.filter((c) => c.importance === 'required' && !c.granted))
const missingRecommended = computed(() => checklist.value.filter((c) => c.importance === 'recommended' && !c.granted))
const iosNeedsShortcut = computed(() => platform === 'ios' && !platformInfo.value.lastAutomationRun)
/** What setup still asks for: every required item, and recommended ones the user did not skip. */
const setupItems = computed(() =>
  checklist.value.filter(
    (c) => !c.granted && (c.importance === 'required' || (c.importance === 'recommended' && !prefs.skipped.includes(c.name))),
  ),
)

/**
 * 'ringing' | 'paused' (switched off) | 'setup' (something missing, so it
 * cannot ring yet) | 'ready' (waiting for a message).
 */
const status = computed(() => {
  if (ring.value.ringing) return 'ringing' as const
  if (!config.value.armed) return 'paused' as const
  if (setupItems.value.length || !passphraseValid.value || iosNeedsShortcut.value) return 'setup' as const
  return 'ready' as const
})
/**
 * Ready to ring, but recommended (or enabled optional) items are still missing,
 * skipped ones included: offered as "Improve detection reliability".
 */
const improvable = computed(() =>
  status.value === 'ready' ? checklist.value.filter((c) => !c.granted && c.importance !== 'required') : [],
)
/** What the daily check would warn about right now. */
const healthMissing = computed(() => checklist.value.filter((c) => !c.granted && HEALTH_CHECKED.includes(c.name)).map((c) => c.name))
const stepsLeft = computed(() => setupItems.value.length + (iosNeedsShortcut.value ? 1 : 0))
/** SMS access was refused, so a text can never make the phone ring. */
const smsDenied = computed(
  () =>
    capabilities.value.sms !== 'granted' &&
    capabilities.value.sms !== 'unsupported' &&
    (capabilities.value.sms === 'blocked' || prefs.smsDeclined),
)
const remainingMs = computed(() => (ring.value.ringing && ring.value.endsAt ? Math.max(0, ring.value.endsAt - now.value) : 0))

// ---- Persistence ----

let saveTimer: ReturnType<typeof setTimeout> | undefined
watch(
  config,
  (value) => {
    if (!loaded.value) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => void RemoteRing.setConfig({ config: { ...value, senders: [...value.senders] } }), 200)
  },
  { deep: true },
)

watch(wordLanguage, async (code) => {
  words.value = await loadWords(code)
})

let tick: ReturnType<typeof setInterval> | undefined
watch(
  () => ring.value.ringing,
  (ringing) => {
    clearInterval(tick)
    if (ringing) tick = setInterval(() => (now.value = Date.now()), 250)
  },
)

// ---- Actions ----

async function refreshCapabilities() {
  capabilities.value = await RemoteRing.checkCapabilities()
}

async function refreshHistory() {
  history.value = (await RemoteRing.getHistory()).records
}

async function refreshPlatform() {
  platformInfo.value = await RemoteRing.getPlatformInfo()
}

async function init() {
  words.value = await loadWords(wordLanguage.value)
  const stored = (await RemoteRing.getConfig()).config
  const fallback = generateWords(words.value, prefs.wordCount).join(' ')
  config.value = sanitizeConfig(stored, fallback)
  loaded.value = true
  if (!stored) await RemoteRing.setConfig({ config: config.value })
  await Promise.all([refreshCapabilities(), refreshHistory(), refreshPlatform()])
  ring.value = await RemoteRing.getRingState()
  now.value = Date.now()

  if (platform !== 'ios') {
    await RemoteRing.addListener('healthNoticeOpened', () => void reviewPermissions())
    if ((await RemoteRing.getLaunchRequest()).healthNotice) await reviewPermissions()
  }

  await RemoteRing.addListener('ringStateChange', (state) => {
    ring.value = state
    now.value = Date.now()
    if (!state.ringing) void refreshHistory()
  })
  // Settings pages and system dialogs return through "resume": re-read everything they may change.
  void CapApp.addListener('resume', () => {
    void refreshCapabilities()
    void refreshPlatform()
    void refreshHistory()
    void RemoteRing.getRingState().then((s) => (ring.value = s))
  })
}

// ---- Daily check ----

/** Set while the list opened from the warning is open: closing it with something missing asks once more. */
let reviewing = false

/** The warning was tapped: show what is granted and what isn't. */
async function reviewPermissions() {
  await refreshCapabilities()
  reviewing = true
  if (topSheet.value?.name !== 'checklist') openSheet('checklist')
}

onSheetClosed((name) => {
  if (name !== 'checklist' || !reviewing) return
  reviewing = false
  if (healthMissing.value.length) openSheet('health-warning')
})

/** "Don't remind me again": the daily check skips what is missing now, and warns about anything new. */
async function ignoreHealth() {
  await RemoteRing.setHealthIgnored({ names: [...healthMissing.value] })
}

function regenerate() {
  if (!words.value.length) return
  prefs.customPassphrase = false
  config.value.passphrase = generateWords(words.value, prefs.wordCount).join(' ')
  haptic.tap()
}

function setWordCount(count: number) {
  prefs.wordCount = Math.max(MIN_WORDS, Math.min(MAX_WORDS, count))
  regenerate()
}

function setWordLanguage(code: LanguageCode | 'auto') {
  prefs.wordLanguage = code
  void loadWords(code === 'auto' ? language.value : code).then((list) => {
    words.value = list
    regenerate()
  })
}

function setCustomPassphrase(text: string) {
  prefs.customPassphrase = true
  config.value.passphrase = text.replace(/\s+/g, ' ').trimStart()
}

function addSender(value = '') {
  if (config.value.senders.length >= MAX_SENDERS) return
  config.value.senders.push(value)
  haptic.tap()
}

function updateSender(index: number, value: string) {
  config.value.senders[index] = value.replace(/[^\d+\-() .\p{L}]/gu, '').slice(0, 24)
}

function removeSender(index: number) {
  config.value.senders.splice(index, 1)
  haptic.tap()
}

function setDuration(seconds: number) {
  if (config.value.durationSeconds !== seconds) haptic.tick()
  config.value.durationSeconds = seconds
}

function stepDuration(direction: 1 | -1) {
  const i = DURATION_STEPS.findIndex((s) => s >= config.value.durationSeconds)
  const current = i < 0 ? DURATION_STEPS.length - 1 : i
  const next = DURATION_STEPS[Math.max(0, Math.min(DURATION_STEPS.length - 1, current + direction))]
  setDuration(next)
}

/** Tones offered here: the phone's alarm sound only exists on Android. */
const tones = computed(() => TONES.filter((id) => id !== 'system' || platform !== 'ios'))

function setTone(tone: ToneId) {
  config.value.tone = tone
  haptic.tick()
  void RemoteRing.previewTone({ tone })
}

function stopTonePreview() {
  void RemoteRing.stopPreview()
}

function setVolume(percent: number) {
  config.value.volume = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, Math.round(percent / 10) * 10))
  haptic.tick()
}

function setTheme(choice: ThemeChoice) {
  prefs.theme = choice
  haptic.tick()
}

function setVibrate(on: boolean) {
  config.value.vibrate = on
  haptic.tap()
}

function setOverrideDnd(on: boolean) {
  config.value.overrideDnd = on
  if (!on) return
  prefs.skipped = prefs.skipped.filter((n) => n !== 'dnd')
  if (capabilities.value.dnd !== 'granted' && capabilities.value.dnd !== 'unsupported') void askCapability('dnd')
}

/** Optional: also ring from chat apps (Android), which needs Notification access. */
async function setChatApps(on: boolean) {
  config.value.chatApps = on
  if (!on || capabilities.value.notificationAccess === 'granted') return
  // Without access it can't work, so the switch goes back off if the user declines.
  if (!(await askCapability('notificationAccess'))) config.value.chatApps = false
}

const isGranted = (name: CapabilityName) => capabilities.value[name] === 'granted'

/**
 * The only path to a system permission dialog: our explanation sheet first,
 * and the system dialog only after the user taps Allow there.
 */
async function askCapability(name: CapabilityName): Promise<boolean> {
  if (capabilities.value[name] === 'granted' || capabilities.value[name] === 'unsupported') return true
  askedOnUse.add(name)
  const allowed = await explainCapability(name)
  await refreshCapabilities()
  const granted = allowed && isGranted(name)
  if (granted) prefs.skipped = prefs.skipped.filter((n) => n !== name)
  if (name === 'sms') prefs.smsDeclined = !granted
  return granted
}

/** Capabilities already asked for this session: features don't ask twice in a row. */
const askedOnUse = new Set<CapabilityName>()

/**
 * Before a feature runs: ask (explainer first) for anything it needs that is
 * still missing, including items skipped during setup. Each is asked at most
 * once per session from here, so repeated taps don't nag.
 */
async function askForFeature(feature: keyof typeof NEEDS) {
  for (const name of NEEDS[feature]) {
    const item = checklist.value.find((c) => c.name === name)
    if (!item || item.granted || askedOnUse.has(name)) continue
    await askCapability(name)
  }
}

/** Called by the permission sheet after the user confirmed. */
async function grantFromSheet(name: CapabilityName): Promise<boolean> {
  const state = capabilities.value[name]
  capabilities.value =
    state === 'blocked' ? (await RemoteRing.openSettings({ name }), await RemoteRing.checkCapabilities()) : await RemoteRing.requestCapability({ name })
  const granted = capabilities.value[name] === 'granted'
  if (granted) haptic.success()
  return granted
}

/**
 * The whole setup: one explainer per missing permission, numbered "step n of
 * total". Declining a recommended one skips it (it stays in the checklist);
 * declining the required one stops.
 */
async function runSetup() {
  const items = [...setupItems.value]
  const total = items.length + (iosNeedsShortcut.value ? 1 : 0)
  try {
    for (const [i, item] of items.entries()) {
      setupProgress.value = { step: i + 1, total }
      const ok = await askCapability(item.name)
      if (!ok && item.importance === 'required') return false
      if (!ok && !prefs.skipped.includes(item.name)) prefs.skipped.push(item.name)
    }
  } finally {
    setupProgress.value = null
  }
  if (iosNeedsShortcut.value) openSheet('ios-setup')
  if (!missingRequired.value.length) haptic.success()
  return missingRequired.value.length === 0
}

/**
 * "Improve detection reliability": one explainer per missing item, skipped
 * ones too. Declining one moves on to the next. When Android won't show its
 * dialog any more, the explainer says so and opens Settings instead.
 */
async function improveReliability() {
  const items = [...improvable.value]
  try {
    for (const [i, item] of items.entries()) {
      setupProgress.value = { step: i + 1, total: items.length }
      await askCapability(item.name)
    }
  } finally {
    setupProgress.value = null
  }
}

async function setArmed(on: boolean) {
  if (!on) {
    config.value.armed = false
    haptic.tap()
    return
  }
  if (!passphraseValid.value) {
    openSheet('passphrase')
    return
  }
  config.value.armed = true
  haptic.success()
  if (setupItems.value.length || iosNeedsShortcut.value) await runSetup()
  else await askForFeature('arm')
}

async function testRing() {
  // A test is the moment people notice what is missing: offer it first, then ring anyway.
  await askForFeature('test')
  haptic.thud()
  await RemoteRing.startRinging({ durationSeconds: Math.min(config.value.durationSeconds, 30), vibrate: config.value.vibrate })
  ring.value = await RemoteRing.getRingState()
  now.value = Date.now()
}

async function stopRing() {
  haptic.tap()
  await RemoteRing.stopRinging()
  ring.value = { ringing: false }
}

async function clearHistory() {
  await RemoteRing.clearHistory()
  history.value = []
}

async function copyPassphrase() {
  const ok = await copyText(config.value.passphrase)
  if (ok) haptic.success()
  return ok
}

async function sharePassphrase() {
  return shareText(t.value.passphrase.shareTitle, t.value.passphrase.shareText(config.value.passphrase))
}

function simulate(body: string, sender: string) {
  return evaluateMessage(config.value, body, sender)
}

const state = reactive({
  config,
  loaded,
  capabilities,
  platformInfo,
  ring,
  history,
  words,
  wordLanguage,
  passphraseWords,
  passphraseValid,
  strengthBits,
  strengthLevel,
  checklist,
  missingRequired,
  missingRecommended,
  setupItems,
  iosNeedsShortcut,
  status,
  healthMissing,
  stepsLeft,
  smsDenied,
  improvable,
  remainingMs,
  tones,
})

const actions = {
  init,
  regenerate,
  setWordCount,
  setWordLanguage,
  setCustomPassphrase,
  addSender,
  updateSender,
  removeSender,
  setDuration,
  stepDuration,
  setVibrate,
  setTone,
  stopTonePreview,
  setVolume,
  setTheme,
  setOverrideDnd,
  setChatApps,
  askCapability,
  grantFromSheet,
  runSetup,
  improveReliability,
  ignoreHealth,
  setArmed,
  testRing,
  stopRing,
  clearHistory,
  copyPassphrase,
  sharePassphrase,
  simulate,
  refreshCapabilities,
  refreshPlatform,
  openSheet,
}

export function useRingApp() {
  return { state: readonly(state) as typeof state, actions, prefs, platform }
}

export { DURATION_STEPS, MAX_SENDERS, MIN_WORDS, MAX_WORDS }
