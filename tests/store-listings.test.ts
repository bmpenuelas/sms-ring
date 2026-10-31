import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import { LANGUAGES } from '../src/i18n/languages.ts'
import { storeDescription } from '../src/i18n/store-description.ts'

const github = 'https://github.com/bmpenuelas/sms-ring'

test('store descriptions keep shared lines and only the selected platform, including blank lines', () => {
  const lines = ['shared', { android: 'notification access' }, { ios: 'Shortcuts' }, { ios: '' }, 'source']
  assert.equal(storeDescription(lines, 'android'), 'shared\nnotification access\nsource')
  assert.equal(storeDescription(lines, 'ios'), 'shared\nShortcuts\n\nsource')
})

test('iOS uses plain arrow bullets while Android keeps emoji, including presentation selectors', () => {
  const lines = ['🔔 Ring', '📳 Vibration', '✉️ Message', '🔒 Privacy', '👀 Source']
  assert.equal(storeDescription(lines, 'android'), lines.join('\n'))
  assert.equal(storeDescription(lines, 'ios'), '► Ring\n► Vibration\n► Message\n► Privacy\n► Source')
})

for (const lang of LANGUAGES) {
  test(`store listings/${lang.code}: platform-specific copy and generated metadata`, async () => {
    const { default: messages } = await import(`../src/i18n/locales/${lang.code}.ts`)
    assert.ok(messages.store.subtitle.trim())
    assert.ok([...messages.store.subtitle].length <= 30, 'subtitle fits the App Store limit')
    assert.equal(
      await readFile(new URL(`../store/fastlane/metadata/ios/${lang.appStore}/subtitle.txt`, import.meta.url), 'utf8'),
      `${messages.store.subtitle}\n`,
    )
    assert.ok(messages.store.promo.trim())
    assert.ok([...messages.store.promo].length <= 170, 'promotional text fits the App Store limit')
    assert.equal(
      await readFile(new URL(`../store/fastlane/metadata/ios/${lang.appStore}/promotional_text.txt`, import.meta.url), 'utf8'),
      `${messages.store.promo}\n`,
    )
    assert.ok([...messages.store.shortDescription].length <= 80, 'short description fits the Play Store limit')
    assert.equal(
      await readFile(new URL(`../store/fastlane/metadata/android/${lang.play}/short_description.txt`, import.meta.url), 'utf8'),
      `${messages.store.shortDescription}\n`,
    )
    for (const platform of ['android', 'ios'] as const) {
      const description = storeDescription(messages.store.description, platform)
      const path = platform === 'android'
        ? `android/${lang.play}/full_description.txt`
        : `ios/${lang.appStore}/description.txt`
      assert.equal(await readFile(new URL(`../store/fastlane/metadata/${path}`, import.meta.url), 'utf8'), `${description}\n`)
      assert.ok([...description].length <= 4000)
      assert.doesNotMatch(description, /🧪|🌍|⏱|🌙|✨/u)
      assert.doesNotMatch(description, /Android\s*[:：]/u)
      const marker = (emoji: string) => platform === 'ios' ? '►' : emoji
      if (platform === 'android') {
        for (const emoji of ['🎲', '📱', '📳']) {
          assert.equal(description.split('\n').filter((line) => line.startsWith(emoji)).length, 1)
        }
      } else {
        assert.doesNotMatch(description, /\p{Extended_Pictographic}|\uFE0F/u)
        assert.equal(description.split('\n').filter((line) => line.startsWith('► ')).length, 7)
      }
      const paragraphs = description.split('\n\n')
      for (const intro of paragraphs.slice(0, 2)) {
        assert.ok(intro.trim())
        assert.doesNotMatch(intro, /🔔|📳|🔒|👀/u, 'two introductory paragraphs precede the features')
      }
      const features = paragraphs[2].split('\n')
      assert.ok(features[0].startsWith(marker('🔔')))
      assert.ok(features[1].startsWith(marker('📳')), 'vibration is the second feature')
      assert.ok(features.at(-1)!.startsWith(marker('🔓')))
      const privacy = paragraphs[3].split('\n')
      assert.equal(privacy.length, 2, 'privacy paragraph follows the features')
      assert.ok(privacy[0].startsWith(marker('🔒')))
      assert.doesNotMatch(privacy[0], /[.。।]$/u, 'privacy heading has no trailing full stop')
      const footer = paragraphs.at(-1)!.split('\n')
      for (const heading of [privacy[0], footer[0]]) {
        if (heading.toLowerCase() !== heading.toUpperCase()) {
          assert.notEqual(heading, heading.toUpperCase(), 'headings must not be all uppercase')
        }
      }
      assert.equal(footer.length, 3)
      assert.ok(footer[0].startsWith(marker('👀')))
      assert.ok(footer[1].includes('GitHub'))
      assert.equal(footer[2], github)
      if (platform === 'android') {
        assert.doesNotMatch(description, /iOS|iPhone|Apple|Shortcuts/u)
        assert.ok(description.includes('💬'))
        for (const app of ['WhatsApp', 'Messenger', 'Telegram', 'Signal']) assert.ok(description.includes(app))
        assert.match(features.find((line) => line.startsWith('💬'))!, /Signal(?:em)?\.\.\.$/u)
      } else {
        assert.doesNotMatch(description, /Android|💬|WhatsApp|Messenger|Telegram|Signal/u)
        const setup = messages.store.description.find((line: string | { ios?: string }) => typeof line === 'object' && line.ios)?.ios
        assert.ok(setup?.includes('Apple'))
        assert.equal(paragraphs[4], setup, 'localized setup warning appears before the open-source section')
        assert.doesNotMatch(description, /iPhone\s*[:：]/u)
      }
    }
    // Check every exported metadata field, not just the long descriptions.
    for (const [platform, locale] of [['android', lang.play], ['ios', lang.appStore]]) {
      const files = platform === 'android'
        ? ['title', 'short_description', 'full_description']
        : ['name', 'subtitle', 'keywords', 'promotional_text', 'description']
      for (const file of files) {
        const text = await readFile(new URL(`../store/fastlane/metadata/${platform}/${locale}/${file}.txt`, import.meta.url), 'utf8')
        assert.doesNotMatch(text, platform === 'android' ? /iOS|iPhone|Apple/u : /Android/u)
        if (platform === 'ios') assert.doesNotMatch(text, /\p{Extended_Pictographic}|\uFE0F/u)
      }
    }
  })
}

test('English listings contain the requested replacement wording', async () => {
  const { default: messages } = await import('../src/i18n/locales/en.ts')
  assert.equal(messages.store.subtitle, 'Works even without internet')
  assert.equal(messages.store.promo,
    'Works even on silent and without internet. Just send an SMS to make your phone ring.')
  assert.equal(messages.store.shortDescription,
    'Even on silent and without internet, send an SMS to make your phone ring')
  for (const platform of ['android', 'ios'] as const) {
    const description = storeDescription(messages.store.description, platform)
    assert.ok(description.startsWith(
      'Make your phone ring at full volume by sending an SMS to it. It rings at full volume, even on silent. No internet connection is needed, works even with just a weak mobile signal.\n\n'
      + 'Online phone finders can only ring a phone that’s connected to the internet, and they require you to log in on another device, connect to your phone... SMS Ring just needs mobile signal. No internet, no accounts, no logins.\n\n',
    ))
    for (const line of [
      '🎲 Choose your secret passphrase to make it ring',
      '📱 Allow from any number, or only the numbers you choose',
      '📳 Optional vibration, and vibration-only mode',
      '🔒 Private by design, not by promise',
      '👀 Open Source: You can verify it yourself',
      'Every line of code is public so you can inspect it in GitHub',
    ]) {
      const expected = platform === 'ios' ? line.replace(/^\p{Extended_Pictographic}/u, '►') : line
      assert.ok(description.split('\n').includes(expected))
    }
  }
  assert.ok(storeDescription(messages.store.description, 'android').includes(
    '💬 Also works with WhatsApp, Messenger, Telegram, Signal...',
  ))
  assert.ok(storeDescription(messages.store.description, 'ios').split('\n').includes(
    'SETUP (IMPORTANT!): Apple doesn’t let apps read messages. SMS Ring guides you through a 1-minute Shortcuts automation that you have to create for the app to be able to read the incoming message.',
  ))
})
