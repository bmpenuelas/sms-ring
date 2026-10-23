// Light or dark appearance: follows the system unless the user picked one.
// Applied as <html data-theme="…">, which the colour tokens key off.

import { StatusBar, Style } from '@capacitor/status-bar'
import { computed, ref, watchEffect } from 'vue'

import { isNative } from '../services/device'
import { prefs } from './prefs'

export type ThemeChoice = 'system' | 'light' | 'dark'
export const THEMES: readonly ThemeChoice[] = ['system', 'light', 'dark']

/** Page background per theme (browser chrome and status bar match it). */
const BACKGROUND = { light: '#ffffff', dark: '#0f1016' } as const

const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
const systemDark = ref(media?.matches ?? false)
media?.addEventListener('change', (e) => (systemDark.value = e.matches))

export const theme = computed<'light' | 'dark'>(() =>
  prefs.theme === 'system' ? (systemDark.value ? 'dark' : 'light') : prefs.theme,
)

/** Keeps the page, browser chrome and status bar in the current theme. Call once before mounting. */
export function startTheme() {
  watchEffect(() => {
    const current = theme.value
    const root = document.documentElement
    root.dataset.theme = current
    root.style.colorScheme = current
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BACKGROUND[current])
    // Style.Light = dark icons for a light page, and the other way round.
    if (isNative) void StatusBar.setStyle({ style: current === 'dark' ? Style.Dark : Style.Light }).catch(() => undefined)
  })
}
