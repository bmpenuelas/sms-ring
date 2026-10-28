import type { RingConfig } from 'capacitor-remote-ring'
import type { Messages } from '../i18n/locales/en.ts'

/** One source for every Copy/Share entry point; never describe a disabled mode. */
export function buildPassphraseInstructions(
  config: Pick<RingConfig, 'passphrase' | 'vibrate' | 'vibrateOnlyEnabled' | 'vibrateOnlyPhrase' | 'senders' | 'armed' | 'chatApps'>,
  copy: Messages['app']['sharing'],
): string {
  return [
    copy.intro,
    (config.vibrate ? copy.ringVibrate : copy.ring)(config.passphrase),
    ...(config.vibrateOnlyEnabled ? [
      copy.vibrateOnly(`${config.passphrase} ${config.vibrateOnlyPhrase}`),
    ] : []),
    ...(config.senders.some((sender) => sender.trim()) ? [copy.senderRestricted] : []),
    ...(config.chatApps ? [copy.chatApps] : []),
    ...(!config.armed ? [copy.paused] : []),
    copy.keepSecret,
  ].join('\n\n')
}
