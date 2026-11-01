#!/usr/bin/env node
// Export the existing Fastlane text files, without regenerating or changing them.
import './lib/cli-failure.mjs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { LANGUAGES } from '../src/i18n/languages.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const stores = {
  android: { localeKey: 'play', fields: ['title', 'short_description', 'full_description'] },
  ios: { localeKey: 'appStore', fields: ['name', 'subtitle', 'description', 'keywords', 'promotional_text'] },
}

// Quote every cell: commas, quotes and embedded newlines remain literal text.
const cell = (value) => `"${value.replaceAll('"', '""')}"`

export async function generateStoreCsv(platform, {
  metadataRoot = join(root, 'store/fastlane/metadata'),
  languages = LANGUAGES,
} = {}) {
  if (!Object.hasOwn(stores, platform)) throw new Error('Store must be android or ios (Apple).')
  const { localeKey, fields } = stores[platform]
  const extraFields = new Set()
  const rows = []

  // Use the supported-language registry rather than silently skipping missing folders.
  for (const language of languages) {
    const locale = language[localeKey]
    const directory = join(metadataRoot, platform, locale)
    const entries = await readdir(directory, { withFileTypes: true })
    const filenames = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.txt')).map((entry) => entry.name)
    for (const field of fields) {
      if (!filenames.includes(`${field}.txt`)) throw new Error(`Missing store listing: ${join(directory, `${field}.txt`)}`)
    }
    const values = new Map()
    for (const filename of filenames.sort()) {
      const field = filename.slice(0, -4)
      const text = await readFile(join(directory, filename), 'utf8')
      // Strip only an encoding marker and one file-terminating newline, not copy whitespace.
      values.set(field, text.replace(/^\uFEFF/u, '').replace(/\r?\n$/u, ''))
      if (!fields.includes(field)) extraFields.add(field)
    }
    rows.push({ locale, values })
  }

  const columns = [...fields, ...[...extraFields].sort()]
  const records = [
    ['locale', ...columns],
    ...rows.map(({ locale, values }) => [locale, ...columns.map((field) => values.get(field) ?? '')]),
  ]
  // UTF-8 BOM helps spreadsheet apps detect all 20 languages correctly.
  return `\uFEFF${records.map((record) => record.map(cell).join(',')).join('\r\n')}\r\n`
}

async function main() {
  const [platform, output, ...extra] = process.argv.slice(2)
  if (!Object.hasOwn(stores, platform) || extra.length || output?.startsWith('--')) {
    throw new Error('Usage: node scripts/generate-store-csv.mjs <android|ios> [output.csv]')
  }
  const destination = output ? resolve(output) : join(root, 'store/exports', `${platform}.csv`)
  const csv = await generateStoreCsv(platform)
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, csv, 'utf8')
  console.log(`Exported ${LANGUAGES.length} ${platform} listings to ${destination}`)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
