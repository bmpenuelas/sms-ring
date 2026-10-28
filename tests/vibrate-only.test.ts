import assert from 'node:assert/strict'
import { test } from 'node:test'

import { sanitizeConfig } from '../src/core/config.ts'
import { evaluateMessage } from '../src/core/matcher.ts'
import { LANGUAGES } from '../src/i18n/languages.ts'

test('every locale supplies a working vibration-only default and translated UI copy', async () => {
  for (const { code } of LANGUAGES) {
    const { default: messages } = await import(`../src/i18n/locales/${code}.ts`)
    const config = sanitizeConfig({ vibrateOnlyEnabled: true }, 'blue tiger moon', messages.app.vibrateOnly.defaultPhrase)
    for (const [key, value] of Object.entries(messages.app.vibrateOnly)) {
      if (key === 'hint') continue
      assert.ok(typeof value === 'string' && value.trim())
    }
    assert.ok(messages.app.vibrateOnly.hint('custom words').includes('custom words'))
    assert.ok(messages.app.tryIt.verdicts['vibrate-only'])
    assert.equal(evaluateMessage(config, `${config.vibrateOnlyPhrase} “blue tiger moon”`, ''), 'vibrate-only', code)
    assert.equal(evaluateMessage(config, `“blue tiger moon ${config.vibrateOnlyPhrase}”`, ''), 'vibrate-only', code)
    const foldedModifier = config.vibrateOnlyPhrase.toUpperCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/\s/gu, '')
    assert.equal(evaluateMessage(config, `“${foldedModifier}”\n“BLUE TIGER MOON”`, ''), 'vibrate-only', code)
    assert.equal(evaluateMessage(config, 'blue tiger moon', ''), 'ring', code)
  }
})

test('quotes remain literal inside the configured parts, including surrogate pairs', () => {
  const config = { armed: true, passphrase: 'find “my” 📱', senders: [], vibrateOnlyEnabled: true, vibrateOnlyPhrase: 'hush “now”' }
  for (const body of ['find “my” 📱 hush “now”', '“hush “now”” “find “my” 📱”', '「find “my” 📱 hush “now”」']) {
    assert.equal(evaluateMessage(config, body, ''), 'vibrate-only', body)
  }
  assert.equal(evaluateMessage(config, 'find my 📱 hush now', ''), 'no-passphrase')
})
