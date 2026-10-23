// Thin wrappers over the device plugins the UI uses for feedback and sharing.
// All of them work offline and fail silently in a browser preview.

import { Capacitor } from '@capacitor/core'
import { Clipboard } from '@capacitor/clipboard'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Share } from '@capacitor/share'

export const platform = Capacitor.getPlatform() as 'android' | 'ios' | 'web'
export const isNative = Capacitor.isNativePlatform()

export const haptic = {
  tap() {
    if (isNative) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined)
  },
  thud() {
    if (isNative) void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => undefined)
  },
  tick() {
    if (isNative) void Haptics.selectionChanged().catch(() => undefined)
  },
  success() {
    if (isNative) void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined)
  },
  warn() {
    if (isNative) void Haptics.notification({ type: NotificationType.Warning }).catch(() => undefined)
  },
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (isNative) await Clipboard.write({ string: text })
    else await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** System share sheet (the user picks where it goes); copies when unavailable. */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (isNative) {
      await Share.share({ title, text, dialogTitle: title })
      return 'shared'
    }
    if (navigator.share) {
      await navigator.share({ title, text })
      return 'shared'
    }
  } catch {
    // Dismissed or unavailable: fall through to copying.
  }
  return (await copyText(text)) ? 'copied' : 'failed'
}

/** Opens a URL in the system browser (the app itself never connects). */
export function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}
