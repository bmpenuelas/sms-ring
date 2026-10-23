// The contract between the web UI and the native ringer. Everything stays on
// the device: the plugin has no network code on either platform.

import type { PluginListenerHandle } from '@capacitor/core'

/** What the native side needs to decide whether an incoming trigger should ring. */
export interface RingConfig {
  /** Schema version, bumped on breaking changes. */
  version: 1
  /** Master switch. When false, nothing rings no matter what arrives. */
  armed: boolean
  /** The secret phrase. A message must be exactly this; only spaces, capitals and accents may differ. */
  passphrase: string
  /** Allowed senders. Empty = anyone who knows the passphrase. */
  senders: string[]
  /** How long to ring, in seconds. */
  durationSeconds: number
  /** Vibrate while ringing. */
  vibrate: boolean
  /** Android only: temporarily lift Do Not Disturb while ringing (needs DND access). On by default. */
  overrideDnd: boolean
  /** Which sound rings. "system" (Android only) is the phone's own alarm sound. */
  tone: ToneId
  /** Ring volume in percent (10–100) of the maximum alarm volume. 100 by default. */
  volume: number
  /** Android only: also ring from chat apps' notifications (needs Notification access). Off by default. */
  chatApps: boolean
}

/** Bundled synthesized tones, plus the phone's alarm sound on Android. */
export type ToneId = 'beacon' | 'chime' | 'pulse' | 'siren' | 'bells' | 'system'

/**
 * Permission-like capabilities the ringer depends on.
 * - sms: Android RECEIVE_SMS.
 * - notifications: Android POST_NOTIFICATIONS / iOS notification authorization.
 * - fullScreen: Android 14+ full-screen intent (stop screen over the lock screen).
 * - battery: Android battery-optimization exemption (reliable background start).
 * - dnd: Android Do Not Disturb access (ring through "Total silence").
 * - unusedApps: Android 11+ exemption from "Pause app activity if unused" (permissions kept).
 * - autostart: the phone maker's own autostart switch (Xiaomi, Huawei, Oppo, Vivo…); can't be read,
 *   so it counts as granted once the user has visited it.
 * - notificationAccess: Android Notification access, for the optional "Ring from chat apps".
 */
export type CapabilityName =
  | 'sms'
  | 'notifications'
  | 'fullScreen'
  | 'battery'
  | 'dnd'
  | 'unusedApps'
  | 'autostart'
  | 'notificationAccess'

/**
 * - granted: ready.
 * - prompt: the system dialog (or settings page) can still be shown.
 * - blocked: the user denied it for good; only the system settings can change it.
 * - unsupported: not applicable on this platform / OS version.
 */
export type CapabilityState = 'granted' | 'prompt' | 'blocked' | 'unsupported'

export type CapabilityStatus = Record<CapabilityName, CapabilityState>

export type RingReason = 'sms' | 'shortcut' | 'test' | 'app'

export interface RingState {
  ringing: boolean
  reason?: RingReason
  /** Epoch milliseconds when ringing stops on its own. */
  endsAt?: number
  /** Masked sender (e.g. "•••• 1234") when a message triggered it. */
  sender?: string
}

export interface TriggerRecord {
  /** Epoch milliseconds. */
  at: number
  reason: RingReason
  /** Masked sender, never the full number. */
  sender?: string
}

export interface PlatformInfo {
  platform: 'android' | 'ios' | 'web'
  /** How messages reach the ringer: read directly (Android) or through Apple Shortcuts (iOS). */
  triggerMode: 'sms' | 'shortcuts' | 'simulated'
  /**
   * Every permission the installed app declares, read back from the OS
   * (Android). Lets the UI prove there is no INTERNET permission.
   */
  declaredPermissions: string[]
  /** False when the OS confirms the app cannot open network sockets at all. */
  hasInternetPermission: boolean | null
  osVersion: string
}

export interface RemoteRingPlugin {
  getConfig(): Promise<{ config: RingConfig | null }>
  setConfig(options: { config: RingConfig }): Promise<void>

  checkCapabilities(): Promise<CapabilityStatus>
  /**
   * Shows the system dialog or settings page for one capability. The UI must
   * explain the capability first and call this only after the user confirms.
   */
  requestCapability(options: { name: CapabilityName }): Promise<CapabilityStatus>
  /** Opens the system settings page where a blocked capability can be changed. */
  openSettings(options: { name?: CapabilityName }): Promise<void>

  /**
   * Android: whether the app was started by tapping the daily check's "can't ring"
   * warning (true once, then false). A running app gets the `healthNoticeOpened` event instead.
   */
  getLaunchRequest(): Promise<{ healthNotice: boolean }>
  /**
   * Android: stop the daily check from warning about these capabilities ("don't remind me
   * again"). Each one counts again once it has worked and then stops working.
   */
  setHealthIgnored(options: { names: CapabilityName[] }): Promise<void>

  startRinging(options: { durationSeconds: number; vibrate: boolean }): Promise<void>
  stopRinging(): Promise<void>
  /** Plays a few seconds of a tone at the current alarm volume (never raised). */
  previewTone(options: { tone: ToneId }): Promise<void>
  stopPreview(): Promise<void>
  getRingState(): Promise<RingState>

  /** The latest triggers (local only, masked senders), newest first. */
  getHistory(): Promise<{ records: TriggerRecord[] }>
  clearHistory(): Promise<void>

  getPlatformInfo(): Promise<PlatformInfo>

  addListener(event: 'ringStateChange', listener: (state: RingState) => void): Promise<PluginListenerHandle>
  /** Android: the daily check's warning was tapped while the app was running. */
  addListener(event: 'healthNoticeOpened', listener: () => void): Promise<PluginListenerHandle>
  removeAllListeners(): Promise<void>
}
