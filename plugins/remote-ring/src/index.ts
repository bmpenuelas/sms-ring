import { registerPlugin } from '@capacitor/core'

import type { RemoteRingPlugin } from './definitions'

export const RemoteRing = registerPlugin<RemoteRingPlugin>('RemoteRing', {
  web: () => import('./web').then((m) => new m.RemoteRingWeb()),
})

export * from './definitions'
