import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateStoreCsv } from '../scripts/generate-store-csv.mjs'
import { LANGUAGES } from '../src/i18n/languages.ts'

const script = fileURLToPath(new URL('../scripts/generate-store-csv.mjs', import.meta.url))
const fields = {
  android: ['title', 'short_description', 'full_description'],
  ios: ['name', 'subtitle', 'description', 'keywords', 'promotional_text'],
}

// Independent CSV reader for round-trip assertions, including multiline cells.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false
  text = text.replace(/^\uFEFF/u, '')
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++ }
      else quoted = !quoted
    } else if (!quoted && (char === ',' || char === '\r')) {
      row.push(value)
      value = ''
      if (char === '\r') {
        assert.equal(text[++i], '\n')
        rows.push(row)
        row = []
      }
    } else value += char
  }
  assert.equal(quoted, false)
  assert.equal(value, '')
  assert.deepEqual(row, [])
  return rows
}

for (const platform of ['android', 'ios'] as const) {
  test(`${platform} CSV includes every supported locale and every source field`, async () => {
    const csv = await generateStoreCsv(platform)
    assert.ok(csv.startsWith('\uFEFF'))
    assert.equal(csv, await generateStoreCsv(platform), 'exports are deterministic')
    const [header, ...rows] = parseCsv(csv)
    assert.deepEqual(header, ['locale', ...fields[platform]])
    assert.equal(rows.length, LANGUAGES.length)
    for (const [index, language] of LANGUAGES.entries()) {
      const locale = platform === 'android' ? language.play : language.appStore
      assert.equal(rows[index][0], locale)
      for (const [column, field] of fields[platform].entries()) {
        const source = await readFile(new URL(`../store/fastlane/metadata/${platform}/${locale}/${field}.txt`, import.meta.url), 'utf8')
        assert.equal(rows[index][column + 1], source.replace(/^\uFEFF/u, '').replace(/\r?\n$/u, ''))
      }
    }
  })

  test(`${platform} CLI writes a custom output path with spaces from another directory`, async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'sms-ring-csv-'))
    t.after(() => rm(directory, { recursive: true, force: true }))
    const result = spawnSync(process.execPath, [script, platform, 'nested output/listing.csv'], {
      cwd: directory, encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(await readFile(join(directory, 'nested output/listing.csv'), 'utf8'), await generateStoreCsv(platform))
  })
}

test('CSV preserves Unicode, commas, quotes, paragraphs and whitespace, and discovers extra fields', async (t) => {
  const metadataRoot = await mkdtemp(join(tmpdir(), 'sms-ring-csv-'))
  t.after(() => rm(metadataRoot, { recursive: true, force: true }))
  for (const locale of ['en-US', 'ar']) {
    const directory = join(metadataRoot, 'android', locale)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'title.txt'), '\uFEFF  "SMS", 日本語 🔔 العربية  \r\n')
    await writeFile(join(directory, 'short_description.txt'), 'Short, "quoted"\n')
    await writeFile(join(directory, 'full_description.txt'), 'First\r\n\r\nSecond\n\n')
    await mkdir(join(directory, 'images'))
    await writeFile(join(directory, 'ignored.md'), 'not metadata')
  }
  await writeFile(join(metadataRoot, 'android/en-US/release_notes.txt'), 'More, "news"\n')
  const options = { metadataRoot, languages: [{ play: 'en-US' }, { play: 'ar' }] }
  const rows = parseCsv(await generateStoreCsv('android', options))
  assert.deepEqual(rows, [
    ['locale', ...fields.android, 'release_notes'],
    ['en-US', '  "SMS", 日本語 🔔 العربية  ', 'Short, "quoted"', 'First\r\n\r\nSecond\n', 'More, "news"'],
    ['ar', '  "SMS", 日本語 🔔 العربية  ', 'Short, "quoted"', 'First\r\n\r\nSecond\n', ''],
  ])
  await rm(join(metadataRoot, 'android/ar/title.txt'))
  await assert.rejects(generateStoreCsv('android', options), /Missing store listing:.*title\.txt/u)
  await assert.rejects(generateStoreCsv('ios', { metadataRoot }), /ENOENT/u)
})

test('invalid CLI arguments fail with usage instead of writing an export', () => {
  for (const args of [[], ['apple'], ['constructor'], ['android', '--help'], ['ios', 'out.csv', 'extra']]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Usage:.*<android\|ios>/u)
  }
})
