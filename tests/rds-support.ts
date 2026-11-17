import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LANGUAGES } from '../src/i18n/languages.ts'

export const rdsCli = fileURLToPath(new URL('../bin/rds.mjs', import.meta.resolve('reusable-dev-scripts')))
export const LOCALES = LANGUAGES.map(language => ({ app: language.code, play: language.play, apple: language.appStore }))
export const createPaths = (root: string) => ({ root, fastlane: join(root, 'fastlane'), android: join(root, 'fastlane/metadata/android'), ios: join(root, 'fastlane/metadata/ios'), screenshots: join(root, 'fastlane/screenshots'), previews: join(root, 'fastlane/previews') })
type Paths = ReturnType<typeof createPaths>
type Options = Record<string, string | boolean>

export function cli(args: string[], cwd: string) {
  const env = { ...process.env, RDS_BANNERS: '0' }
  delete env.RDS_BANNER_OWNER
  const result = spawnSync(process.execPath, [rdsCli, ...args], { cwd, env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000 })
  if (result.error) throw result.error
  return result
}

export async function storeConfig(root: string, locales = LOCALES) {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'fixture', version: manifest.version }))
  await writeFile(join(root, 'reusable-dev-scripts.config.json'), JSON.stringify({ version: 1, store: {
    root: '.', locales: locales.map(locale => ({ app: locale.app, android: locale.play, ios: locale.apple })),
    defaultLocales: { android: locales[0].play, ios: locales[0].apple }, iosDevices: { iphone: true, ipad: false, watch: false },
  } }))
}

function flags(options: Options) {
  return Object.entries(options).flatMap(([key, value]) => typeof value === 'boolean' ? value ? [`--${key}`] : [] : [`--${key}`, value])
}

export async function runCheck(options: Options, paths: Paths) {
  await storeConfig(paths.root)
  const result = cli(['store', 'check', ...flags(options)], paths.root)
  const items = result.stdout.split(/\r?\n/u).flatMap(line => {
    const match = /^(?:✖ error|▲ warn |○ todo )  (.+?): (.*)$/u.exec(line)
    return match ? [{ level: line.startsWith('✖') ? 'error' : line.startsWith('▲') ? 'warn' : 'todo', where: match[1], message: match[2] }] : []
  })
  return { items, status: result.status, count: (level: string) => items.filter(item => item.level === level).length }
}

export async function changelog(options: Options, paths: Paths) {
  await storeConfig(paths.root)
  return cli(['store', 'changelog', ...flags(options)], paths.root)
}

// Exercise the installed CLI in isolated fixtures; never export into the app's
// source listing tree just to test CSV serialization.
export async function generateStoreCsv(platform: string, { metadataRoot = fileURLToPath(new URL('../store/fastlane/metadata/', import.meta.url)), languages = LANGUAGES, nested = false }: { metadataRoot?: string; languages?: readonly { code?: string; play?: string; appStore?: string }[]; nested?: boolean } = {}) {
  const parent = resolve(tmpdir()), root = await mkdtemp(join(parent, 'rds-store-csv-'))
  try {
    const locales = languages.map(language => ({ app: language.code ?? language.play ?? language.appStore!, play: language.play ?? language.appStore!, apple: language.appStore ?? language.play! }))
    await storeConfig(root, locales)
    for (const locale of locales) {
      const code = platform === 'android' ? locale.play : locale.apple
      const source = join(metadataRoot, platform, code), target = join(root, 'fastlane/metadata', platform, code)
      await mkdir(target, { recursive: true })
      for (const entry of await readdir(source, { withFileTypes: true })) if (entry.isFile() && entry.name.endsWith('.txt')) await writeFile(join(target, entry.name), await readFile(join(source, entry.name)))
    }
    const cwd = nested ? join(root, 'nested workspace') : root
    await mkdir(cwd, { recursive: true })
    const output = 'exports/nested output/listing.csv'
    const result = cli(['store', 'export', '--platform', platform, '--output', output], cwd)
    if (result.status !== 0) throw new Error(result.stderr)
    return await readFile(join(root, output), 'utf8')
  } finally {
    if (dirname(resolve(root)) !== parent) throw new Error('Refusing fixture cleanup outside temporary parent')
    await rm(root, { recursive: true, force: true })
  }
}
