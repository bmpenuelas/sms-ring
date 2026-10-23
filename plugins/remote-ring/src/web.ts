// Browser stand-in used while designing and testing the UI. It simulates the
// native side: capabilities, a synthesized ring tone and the ring timer.

import { WebPlugin } from '@capacitor/core'

import type {
  CapabilityName,
  CapabilityStatus,
  PlatformInfo,
  RemoteRingPlugin,
  RingConfig,
  RingState,
  TriggerRecord,
} from './definitions'

const CONFIG_KEY = 'remoteRing.web.config'
const CAPS_KEY = 'remoteRing.web.capabilities'
const HISTORY_KEY = 'remoteRing.web.history'

const DEFAULT_CAPS: CapabilityStatus = {
  sms: 'prompt',
  notifications: 'prompt',
  fullScreen: 'prompt',
  battery: 'prompt',
  dnd: 'prompt',
  unusedApps: 'prompt',
  autostart: 'prompt',
  notificationAccess: 'prompt',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Preview only: losing it is harmless.
  }
}

export class RemoteRingWeb extends WebPlugin implements RemoteRingPlugin {
  private state: RingState = { ringing: false }
  private stopTimer: ReturnType<typeof setTimeout> | undefined
  private audio: HTMLAudioElement | undefined
  private preview: HTMLAudioElement | undefined
  private previewTimer: ReturnType<typeof setTimeout> | undefined

  async getConfig() {
    return { config: read<RingConfig | null>(CONFIG_KEY, null) }
  }

  async setConfig(options: { config: RingConfig }) {
    write(CONFIG_KEY, options.config)
  }

  async checkCapabilities() {
    return { ...DEFAULT_CAPS, ...read<Partial<CapabilityStatus>>(CAPS_KEY, {}) }
  }

  async requestCapability(options: { name: CapabilityName }) {
    const caps = await this.checkCapabilities()
    caps[options.name] = 'granted'
    write(CAPS_KEY, caps)
    return caps
  }

  async openSettings() {
    // Nothing to open in a browser.
  }

  /** Preview only: open the app with `?health` to see the warning flow. */
  async getLaunchRequest() {
    return { healthNotice: new URLSearchParams(location.search).has('health') }
  }

  async setHealthIgnored() {
    // Nothing runs a daily check in a browser.
  }

  async startRinging(options: { durationSeconds: number; vibrate: boolean }) {
    await this.stopRinging()
    const endsAt = Date.now() + options.durationSeconds * 1000
    this.state = { ringing: true, reason: 'test', endsAt }
    this.playTone()
    if (options.vibrate && 'vibrate' in navigator) navigator.vibrate?.([600, 400, 600, 400, 600])
    this.stopTimer = setTimeout(() => void this.stopRinging(), options.durationSeconds * 1000)
    const history = read<TriggerRecord[]>(HISTORY_KEY, [])
    write(HISTORY_KEY, [{ at: Date.now(), reason: 'test' }, ...history].slice(0, 20))
    this.notifyListeners('ringStateChange', this.state)
  }

  async stopRinging() {
    clearTimeout(this.stopTimer)
    this.audio?.pause()
    this.audio = undefined
    if (this.state.ringing) {
      this.state = { ringing: false }
      this.notifyListeners('ringStateChange', this.state)
    }
  }

  async getRingState() {
    return this.state
  }

  /** The browser only has the default tone: every preview plays it briefly. */
  async previewTone() {
    await this.stopPreview()
    const audio = new Audio(`${import.meta.env.BASE_URL}remote_ring_tone.wav`)
    audio.volume = 0.35 * (read<RingConfig | null>(CONFIG_KEY, null)?.volume ?? 100) / 100
    void audio.play().catch(() => undefined)
    this.preview = audio
    this.previewTimer = setTimeout(() => void this.stopPreview(), 4000)
  }

  async stopPreview() {
    clearTimeout(this.previewTimer)
    this.preview?.pause()
    this.preview = undefined
  }

  async getHistory() {
    return { records: read<TriggerRecord[]>(HISTORY_KEY, []) }
  }

  async clearHistory() {
    write(HISTORY_KEY, [])
  }

  async getPlatformInfo(): Promise<PlatformInfo> {
    return {
      platform: 'web',
      triggerMode: 'simulated',
      declaredPermissions: [],
      hasInternetPermission: null,
      osVersion: navigator.userAgent,
    }
  }

  /** Plays the bundled tone (public/remote_ring_tone.wav), quieter than on a phone. */
  private playTone() {
    const audio = new Audio(`${import.meta.env.BASE_URL}remote_ring_tone.wav`)
    audio.loop = true
    audio.volume = 0.35
    void audio.play().catch(() => undefined)
    this.audio = audio
  }
}
