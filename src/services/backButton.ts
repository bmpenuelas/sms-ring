// Android's back button / gesture: closes the top sheet first, like a dialog.
// With nothing open it sends the app to the background instead of closing it,
// so its state (and a ring in progress) is kept. Registering this listener
// replaces Capacitor's default, which would leave the app straight away.

import { App } from '@capacitor/app'

import { closeSheet, sheetDepth } from '../state/sheets'
import { platform } from './device'

export function handleBackButton() {
  if (platform !== 'android') return
  void App.addListener('backButton', () => {
    if (sheetDepth.value > 0) closeSheet()
    else void App.minimizeApp()
  })
}
