// A small stack of bottom sheets. The UI calls
// openSheet(); the sheet host (ui/SheetHost.vue) renders the top one.

import { computed, ref, shallowReactive } from 'vue'

import type { CapabilityName } from 'capacitor-remote-ring'

export type SheetRequest =
  | { name: 'privacy' }
  | { name: 'permission'; capability: CapabilityName; resolve: (allowed: boolean) => void }
  | { name: 'checklist' }
  | { name: 'health-warning' }
  | { name: 'ios-setup' }
  | { name: 'passphrase' }
  | { name: 'senders' }
  | { name: 'try' }
  | { name: 'history' }
  | { name: 'language' }
  | { name: 'settings' }
  | { name: 'tones' }

export type SheetName = SheetRequest['name']

const stack = shallowReactive<SheetRequest[]>([])

export const topSheet = computed(() => stack[stack.length - 1])
export const sheetDepth = computed(() => stack.length)

type SimpleSheet = Exclude<SheetRequest, { name: 'permission' }>['name']

export function openSheet(name: SimpleSheet) {
  stack.push({ name } as SheetRequest)
}

/** Mode the passphrase sheet opens in once (read and cleared by the sheet). */
export const passphraseStartMode = ref<'words' | 'custom' | null>(null)

/** Opens the passphrase sheet ready to type your own phrase. */
export function editPassphrase() {
  passphraseStartMode.value = 'custom'
  openSheet('passphrase')
}

const closeListeners: ((name: SheetName) => void)[] = []

/** Calls back whenever a sheet is dismissed (not when another opens on top of it). */
export function onSheetClosed(listener: (name: SheetName) => void) {
  closeListeners.push(listener)
}

export function closeSheet() {
  const top = stack.pop()
  if (!top) return
  if (top.name === 'permission') top.resolve(false)
  for (const listener of closeListeners) listener(top.name)
}

export function closeAllSheets() {
  while (stack.length) closeSheet()
}

/** Shows the explanation for one capability; resolves true once the user allowed it. */
export function explainCapability(capability: CapabilityName): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    stack.push({
      name: 'permission',
      capability,
      resolve: (allowed) => {
        if (settled) return
        settled = true
        resolve(allowed)
      },
    })
  })
}

/** Called by the permission sheet when the user finished (allowed or declined). */
export function finishPermission(allowed: boolean) {
  const top = stack[stack.length - 1]
  if (top?.name !== 'permission') return
  stack.pop()
  top.resolve(allowed)
}

/** Set while the setup flow runs, so each explainer can say "Step 2 of 3". */
export const setupProgress = ref<{ step: number; total: number } | null>(null)
