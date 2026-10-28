import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { defaultConfig } from '../src/core/config.ts'
import { buildPassphraseInstructions } from '../src/core/instructions.ts'
import en from '../src/i18n/locales/en.ts'
import { LANGUAGES } from '../src/i18n/languages.ts'

test('shared instructions describe exactly the enabled vibration modes', () => {
  for (const vibrate of [false, true]) {
    for (const vibrateOnlyEnabled of [false, true]) {
      const config = { ...defaultConfig('blue tiger moon', 'hush please'), vibrate, vibrateOnlyEnabled }
      const text = buildPassphraseInstructions(config, en.app.sharing)
      assert.ok(text.includes(vibrate ? 'Text “blue tiger moon” to make it ring and vibrate.' : 'Text “blue tiger moon” to make it ring.'))
      assert.equal(text.includes('Text “blue tiger moon hush please” to make it vibrate without sound.'), vibrateOnlyEnabled)
      assert.doesNotMatch(text, /before or after|quote|Spaces, capitals|Send exactly/)
      assert.equal(text.includes('hush please'), vibrateOnlyEnabled)
      if (!vibrate && !vibrateOnlyEnabled) assert.doesNotMatch(text, /vibrat/i)
      assert.ok(text.endsWith(en.app.sharing.keepSecret))
      assert.doesNotMatch(text, /full volume|Do Not Disturb|even on silent/)
    }
  }
})

test('optional restrictions and paused/chat-app state are only included when applicable', () => {
  const config = defaultConfig('blue tiger moon')
  const ordinary = buildPassphraseInstructions(config, en.app.sharing)
  for (const key of ['senderRestricted', 'paused', 'chatApps'] as const) assert.ok(!ordinary.includes(en.app.sharing[key]))
  const restricted = buildPassphraseInstructions({ ...config, armed: false, senders: ['+34600111222'], chatApps: true }, en.app.sharing)
  for (const key of ['senderRestricted', 'paused', 'chatApps'] as const) assert.ok(restricted.includes(en.app.sharing[key]))
  assert.ok(!restricted.includes('+34600111222'), 'do not disclose allowed phone numbers')
  assert.ok(!buildPassphraseInstructions({ ...config, senders: [' '] }, en.app.sharing).includes(en.app.sharing.senderRestricted))
})

test('all locales generate full instructions for every vibration combination', async () => {
  for (const { code } of LANGUAGES) {
    const { default: messages } = await import(`../src/i18n/locales/${code}.ts`)
    const copy = messages.app.sharing
    for (const vibrate of [false, true]) {
      for (const vibrateOnlyEnabled of [false, true]) {
        const config = { ...defaultConfig('blue tiger moon', messages.app.vibrateOnly.defaultPhrase), vibrate, vibrateOnlyEnabled }
        const text = buildPassphraseInstructions(config, copy)
        assert.ok(text.includes((vibrate ? copy.ringVibrate : copy.ring)(config.passphrase)), code)
        assert.equal(text.includes(copy.vibrateOnly(`${config.passphrase} ${config.vibrateOnlyPhrase}`)), vibrateOnlyEnabled, code)
        assert.equal(text, [
          copy.intro,
          (vibrate ? copy.ringVibrate : copy.ring)(config.passphrase),
          ...(vibrateOnlyEnabled ? [copy.vibrateOnly(`${config.passphrase} ${config.vibrateOnlyPhrase}`)] : []),
          copy.keepSecret,
        ].join('\n\n'), code)
        assert.ok(text.includes(copy.keepSecret), code)
        assert.doesNotMatch(text, /undefined|\{message\}|\{words\}/, code)
      }
    }
    assert.ok(messages.app.vibrateOnly.hint('hush please').includes('hush please'), code)
  }
})

test('both editors reuse the footer and Copy/Share use the same instructions builder', () => {
  for (const path of ['PassphraseSheet.vue', 'VibrateOnlySheet.vue']) {
    const source = readFileSync(new URL(`../src/ui/sheets/${path}`, import.meta.url), 'utf8')
    assert.ok(source.includes('<PassphraseShareActions />'), path)
    assert.ok(!source.includes('async function copy('), path)
  }
  const source = readFileSync(new URL('../src/state/app.ts', import.meta.url), 'utf8')
  assert.ok(source.includes('copyText(buildPassphraseInstructions(config.value, t.value.sharing))'))
  assert.ok(source.includes('shareText(t.value.passphrase.shareTitle, buildPassphraseInstructions(config.value, t.value.sharing))'))
})
