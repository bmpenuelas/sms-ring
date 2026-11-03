import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'

import sharp from 'sharp'

import { changelog, createPaths, packageVersionCode, Report, runCheck } from '../scripts/store-metadata.mjs'
import { LOCALES } from '../scripts/lib/store-specs.mjs'
import { LANGUAGES } from '../src/i18n/languages.ts'

type Paths = ReturnType<typeof createPaths>

async function fixture(t: { after: (fn: () => Promise<void>) => void }): Promise<Paths> {
  const directory = await mkdtemp(join(tmpdir(), 'sms-ring-store-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return createPaths(directory)
}

async function write(path: string, text = 'x') {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, text)
}

async function picture(path: string, width: number, height: number, channels: 3 | 4 = 3) {
  await mkdir(dirname(path), { recursive: true })
  const background = channels === 4 ? { r: 1, g: 2, b: 3, alpha: 0.5 } : { r: 1, g: 2, b: 3 }
  await sharp({ create: { width, height, channels, background } }).png().toFile(path)
}

const messages = (report: InstanceType<typeof Report>, level: string) =>
  report.items.filter((item: { level: string }) => item.level === level).map((item: { where: string; message: string }) => `${item.where}: ${item.message}`)

test('the store language table is the app language registry', () => {
  assert.deepEqual(LOCALES.map((locale: { app: string }) => locale.app), LANGUAGES.map((language) => language.code))
  for (const [index, language] of LANGUAGES.entries()) {
    assert.equal(LOCALES[index].play, language.play)
    assert.equal(LOCALES[index].apple, language.appStore)
  }
})

test('findings: todo items become errors only when strict', () => {
  const lenient = new Report(false)
  const strict = new Report(true)
  for (const report of [lenient, strict]) report.add('todo', 'a', 'missing')
  assert.deepEqual([lenient.count('todo'), lenient.count('error')], [1, 0])
  assert.deepEqual([strict.count('todo'), strict.count('error')], [0, 1])
})

test('text: characters, App Store keyword bytes, stray folders, BOM and URLs', async (t) => {
  const paths = await fixture(t)
  await write(join(paths.android, 'en-US/title.txt'), `${'é'.repeat(31)}\n`)
  await write(join(paths.ios, 'en-US/keywords.txt'), `${'é'.repeat(51)}\n`)
  await write(join(paths.ios, 'xx-XX/name.txt'), 'x\n')
  await write(join(paths.android, 'de-DE/title.txt'), `${String.fromCharCode(0xfeff)}Title\n`)
  await write(join(paths.android, 'de-DE/video.txt'), 'http://example.com/clip\n')
  const report = await runCheck({ scope: 'text' }, paths)
  const errors = messages(report, 'error')
  assert.ok(errors.includes('android/en-US/title.txt: Title is 31 characters, limit 30'))
  assert.ok(errors.includes('ios/en-US/keywords.txt: Keywords is 102 bytes, limit 100'))
  assert.ok(errors.some((text) => text.includes('de-DE/title.txt: starts with a byte order mark')))
  assert.ok(errors.some((text) => text.includes('de-DE/video.txt: must be a YouTube')))
  assert.ok(messages(report, 'warn').some((text) => text.includes('xx-XX')))
  assert.ok(messages(report, 'todo').includes('android/fr-FR: language folder missing; run npm run locales'))
})

test('media: Google Play sizes, long-side ratio, transparency; icon only for the default language', async (t) => {
  const paths = await fixture(t)
  const images = join(paths.android, 'en-US/images')
  await picture(join(images, 'icon.png'), 512, 512, 4)
  await picture(join(images, 'featureGraphic.png'), 1000, 500)
  await picture(join(images, 'phoneScreenshots/1.png'), 1080, 1920)
  await picture(join(images, 'phoneScreenshots/2.png'), 1320, 2868)
  await picture(join(images, 'phoneScreenshots/3.png'), 1080, 1920, 4)
  const errors = messages(await runCheck({ scope: 'media', platform: 'android' }, paths), 'error')
  assert.ok(errors.some((text) => text.includes('featureGraphic.png: is 1000×500, must be exactly 1024×500')))
  assert.ok(errors.some((text) => text.includes('phoneScreenshots/2.png') && text.includes('2×')))
  assert.ok(errors.some((text) => text.includes('phoneScreenshots/3.png') && text.includes('transparent')))
  assert.ok(!errors.some((text) => text.includes('icon.png') || text.includes('phoneScreenshots/1.png')))

  const all = await runCheck({ scope: 'media', platform: 'android', 'all-locales': true }, paths)
  assert.ok(messages(all, 'todo').some((text) => text.startsWith('android/de-DE/images/featureGraphic')))
  assert.ok(!messages(all, 'todo').some((text) => text.startsWith('android/de-DE/images/icon')))
})

test('media: App Store screenshot sizes, the iPhone slot and non-image files', async (t) => {
  const paths = await fixture(t)
  const folder = join(paths.screenshots, 'en-US')
  await picture(join(folder, '1_iphone63.png'), 1206, 2622)
  await picture(join(folder, '2.png'), 1000, 2000)
  await write(join(folder, 'notes.md'))
  const report = await runCheck({ scope: 'media', platform: 'ios' }, paths)
  assert.deepEqual(messages(report, 'error'), [
    'ios/screenshots/en-US/2.png: 1000×2000 matches no App Store screenshot size; fastlane skips it',
  ])
  assert.ok(messages(report, 'warn').some((text) => text.includes('notes.md')))
  assert.ok(![...messages(report, 'todo'), ...messages(report, 'warn')].some((text) => text.includes('iphone:')))
})

test('changelog: version code follows package.json, notes over 500 characters are skipped', async (t) => {
  const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const [major, minor, patch] = version.split('.').map(Number)
  assert.equal(await packageVersionCode(), Math.max(1, major * 1_000_000 + minor * 1_000 + patch))

  const paths = await fixture(t)
  await write(join(paths.ios, 'en-US/release_notes.txt'), 'Fixes.\n')
  await write(join(paths.ios, 'de-DE/release_notes.txt'), `${'x'.repeat(501)}\n`)
  process.exitCode = undefined
  await changelog({ 'version-code': '1000090' }, paths)
  assert.equal(await readFile(join(paths.android, 'en-US/changelogs/1000090.txt'), 'utf8'), 'Fixes.\n')
  await assert.rejects(readFile(join(paths.android, 'de-DE/changelogs/1000090.txt')))
  assert.equal(process.exitCode, 1)
  process.exitCode = undefined
})
