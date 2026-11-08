import type { RingConfig } from 'capacitor-remote-ring'
import type { Messages } from '../i18n/locales/en.ts'

/**
 * One source for every Copy/Share entry point; never describe a disabled mode.
 * On iPhone the Shortcuts automation fires only for messages containing the
 * user's ring word, so `ringWord` starts every message to send ("ring blue tiger moon").
 */
export function buildPassphraseInstructions(
  config: Pick<RingConfig, 'passphrase' | 'vibrate' | 'vibrateOnlyEnabled' | 'vibrateOnlyPhrase' | 'senders' | 'armed' | 'chatApps'>,
  copy: Messages['app']['sharing'],
  ringWord = '',
): string {
  const message = ringWord ? `${ringWord} ${config.passphrase}` : config.passphrase
  return [
    copy.intro,
    (config.vibrate ? copy.ringVibrate : copy.ring)(message),
    ...(config.vibrateOnlyEnabled ? [
      copy.vibrateOnly(`${message} ${config.vibrateOnlyPhrase}`),
    ] : []),
    ...(config.senders.some((sender) => sender.trim()) ? [copy.senderRestricted] : []),
    ...(config.chatApps ? [copy.chatApps] : []),
    ...(!config.armed ? [copy.paused] : []),
    copy.keepSecret,
  ].join('\n\n')
}
