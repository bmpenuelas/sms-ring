// View helpers shared by the home page and the ringing overlay: status copy,
// setup progress, ring-time fractions and the common actions.
import { computed } from 'vue'

import { formatClock, formatDuration, t } from '../i18n'
import { DURATION_STEPS, useRingApp } from '../state/app'
import { openSheet } from '../state/sheets'

export function useView() {
  const app = useRingApp()
  const { state, actions } = app

  const statusTitle = computed(() => {
    const s = t.value.status
    return { ready: s.ready, setup: s.incomplete, paused: s.paused, ringing: s.ringing }[state.status]
  })
  const statusHint = computed(() => {
    const s = t.value.status
    if (state.status === 'ready') return s.readyHint
    if (state.status === 'setup') return s.incompleteHint(Math.max(1, state.stepsLeft))
    if (state.status === 'ringing') return t.value.test.remaining(formatClock(state.remainingMs))
    return s.pausedHint
  })
  const sendersLabel = computed(() =>
    state.config.senders.length ? t.value.senders.onlyThese(state.config.senders.length) : t.value.senders.everyoneShort,
  )
  const durationIndex = computed(() => {
    const i = DURATION_STEPS.findIndex((s) => s >= state.config.durationSeconds)
    return i < 0 ? DURATION_STEPS.length - 1 : i
  })
  const remaining = computed(() => formatClock(state.remainingMs))
  /** Ring time as a share of the longest step (0..1], for gadgets. */
  const durationFraction = computed(() => (durationIndex.value + 1) / DURATION_STEPS.length)
  const ringProgress = computed(() =>
    state.ring.ringing && state.ring.endsAt ? state.remainingMs / (state.config.durationSeconds * 1000) : 0,
  )

  /** "Finish setup · 3": what the setup button says. */
  const setupLabel = computed(() => `${t.value.status.finishSetup} · ${Math.max(1, state.stepsLeft)}`)
  /** Words to show (dots when the user hid the phrase). */
  const words = computed(() => (app.prefs.hidePassphrase ? ['•••', '•••', '•••'] : state.passphraseWords))

  /** One entry per setup step (required + recommended, plus the iOS automation): done or not. */
  const setupSegments = computed(() => {
    const list = state.checklist.filter((c) => c.importance !== 'optional').map((c) => c.granted)
    if (app.platform === 'ios') list.push(!state.iosNeedsShortcut)
    return list.length ? list : [true]
  })
  const setupDone = computed(() => setupSegments.value.filter(Boolean).length)

  /** DND override is on but Android has not granted access yet. */
  const dndNeedsAccess = computed(
    () => state.config.overrideDnd && state.capabilities.dnd !== 'granted' && state.capabilities.dnd !== 'unsupported',
  )
  const dndAvailable = computed(() => state.capabilities.dnd !== 'unsupported')
  const dndLabel = computed(() =>
    !state.config.overrideDnd ? t.value.common.off : dndNeedsAccess.value ? t.value.permissions.allow : t.value.common.on,
  )
  /** DND switch: asks for access first if it is on without it, otherwise toggles. */
  function tapDnd() {
    if (dndNeedsAccess.value) void actions.askCapability('dnd')
    else actions.setOverrideDnd(!state.config.overrideDnd)
  }

  function toggleArmed() {
    void actions.setArmed(!state.config.armed)
  }

  /** Main button: run setup when something is missing, otherwise pause / resume. */
  function primaryAction() {
    if (state.status === 'setup') void actions.runSetup()
    else toggleArmed()
  }

  function toggleTest() {
    if (state.ring.ringing) void actions.stopRing()
    else void actions.testRing()
  }

  return {
    ...app,
    t,
    statusTitle,
    statusHint,
    setupLabel,
    words,
    setupSegments,
    setupDone,
    dndNeedsAccess,
    dndAvailable,
    dndLabel,
    tapDnd,
    sendersLabel,
    durationIndex,
    durationFraction,
    remaining,
    ringProgress,
    toggleArmed,
    primaryAction,
    toggleTest,
    openSheet,
    formatDuration,
    DURATION_STEPS,
  }
}

/** Last digits of a sender for compact displays. */
export function shortSender(s: string): string {
  const digits = s.replace(/\D/g, '')
  return digits.length >= 4 ? `…${digits.slice(-4)}` : s || '…'
}
